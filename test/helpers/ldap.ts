import { execFileSync } from 'child_process';
import { request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { debug } from './debug';

const ID_API_URL = 'http://localhost:8100';
const REPO_ROOT = path.join(__dirname, '..', '..');
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'ldap');
const COMPOSE_ARGS = ['compose', '-f', 'compose.yaml', '-f', 'test/fixtures/ldap/docker-compose.ldap.yml'];

const BASE_DN = 'dc=example,dc=org';
const ADMIN_DN = `cn=admin,${BASE_DN}`;
const ADMIN_PASSWORD = 'adminpw';
const CONFIG_DN = 'cn=config,cn=config';
const CONFIG_PASSWORD = 'configpw';
const ACCESS_GROUP = `cn=liquio,ou=groups,${BASE_DN}`;
const UNIT_GROUP = `cn=liquio-unit,ou=groups,${BASE_DN}`;

const userDn = (uid: string) => `uid=${uid},ou=users,${BASE_DN}`;

/**
 * Runs a command in a service of the LDAP stack (`docker compose` with the LDAP override file).
 * @param serviceArgs Arguments after `compose ... exec -T` (service name and command).
 * @param [input] Standard input of the command.
 * @returns Standard output.
 */
function execInService(serviceArgs: string[], input?: string): string {
  debug(`execInService: ${serviceArgs.join(' ')}`);
  return execFileSync('docker', [...COMPOSE_ARGS, 'exec', '-T', ...serviceArgs], {
    cwd: REPO_ROOT,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * Applies an LDIF with ldapmodify inside the directory container.
 * @param ldif LDIF content.
 * @param [options] Options.
 * @param [options.bindDn] Bind DN (the directory admin by default).
 * @param [options.password] Bind password.
 * @param [options.ignoreErrorsMatching] Substring of an error output to ignore (e.g. 'Already exists').
 */
function ldapModify(
  ldif: string,
  { bindDn = ADMIN_DN, password = ADMIN_PASSWORD, ignoreErrorsMatching }: { bindDn?: string; password?: string; ignoreErrorsMatching?: string } = {},
): void {
  try {
    execInService(['openldap', 'ldapmodify', '-x', '-H', 'ldap://localhost:1389', '-D', bindDn, '-w', password], ldif);
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}`;
    if (ignoreErrorsMatching && output.includes(ignoreErrorsMatching)) {
      debug(`ldapModify: ignored error "${ignoreErrorsMatching}"`);
      return;
    }
    throw new Error(`ldapmodify failed: ${output || error.message}`, { cause: error });
  }
}

/**
 * Checks if an entry exists in the directory.
 * @param dn Entry DN.
 * @returns True if the entry exists.
 */
function ldapEntryExists(dn: string): boolean {
  try {
    execInService([
      'openldap',
      'ldapsearch',
      '-x',
      '-H',
      'ldap://localhost:1389',
      '-D',
      ADMIN_DN,
      '-w',
      ADMIN_PASSWORD,
      '-b',
      dn,
      '-s',
      'base',
      'dn',
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the memberOf overlay and the test users and groups, unless they are already there.
 */
function seedDirectory(): void {
  if (ldapEntryExists(userDn('alice'))) {
    debug('seedDirectory: Directory is already seeded');
    return;
  }

  debug('seedDirectory: Loading memberOf overlay');
  const overlay = fs.readFileSync(path.join(FIXTURES_DIR, 'overlay.ldif'), 'utf8');
  ldapModify(overlay, { bindDn: CONFIG_DN, password: CONFIG_PASSWORD, ignoreErrorsMatching: 'Type or value exists' });

  debug('seedDirectory: Loading users and groups');
  ldapModify(fs.readFileSync(path.join(FIXTURES_DIR, 'directory.ldif'), 'utf8'));
}

/**
 * Adds a user to a group.
 * @param uid User uid.
 * @param groupDn Group DN.
 */
function addToGroup(uid: string, groupDn: string): void {
  ldapModify(`dn: ${groupDn}\nchangetype: modify\nadd: member\nmember: ${userDn(uid)}\n`, { ignoreErrorsMatching: 'Type or value exists' });
}

/**
 * Removes a user from a group.
 * @param uid User uid.
 * @param groupDn Group DN.
 */
function removeFromGroup(uid: string, groupDn: string): void {
  ldapModify(`dn: ${groupDn}\nchangetype: modify\ndelete: member\nmember: ${userDn(uid)}\n`, { ignoreErrorsMatching: 'No such attribute' });
}

/**
 * Forgets failed login attempts, so repeated runs of the suite do not hit the attempts limit.
 */
function resetLoginAttempts(): void {
  execInService(['redis', 'sh', '-c', 'redis-cli --scan --pattern "*auth-ldap*" | xargs -r redis-cli del']);
}

/**
 * Runs an SQL statement in the stack database (the `bpmn` database shared by manager and task by default).
 * @param sql SQL statement.
 * @param [database] Database name.
 * @returns Unaligned output without headers.
 */
function psql(sql: string, database = 'bpmn'): string {
  return execInService(['postgres', 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql]).trim();
}

/**
 * Basic credentials of the services calling id-api (the OAuth secret from the id config).
 * @returns Value of the Authorization header.
 */
function getIdApiBasicAuth(): string {
  const idConfig = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'id', 'config.json'), 'utf8'));
  return `Basic ${idConfig.production.oauth.secret_key[0]}`;
}

/**
 * Checks whether id-api offers the LDAP login.
 * @param request Request context.
 * @returns True if the ldap provider is enabled.
 */
async function isLdapProviderEnabled(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${ID_API_URL}/auth_providers`);
    if (!response.ok()) {
      return false;
    }
    const { providers } = await response.json();
    return providers.some((provider: { type: string }) => provider.type === 'ldap');
  } catch {
    return false;
  }
}

/**
 * Logs in through the API and returns the response with the session cookie.
 * @param request Request context.
 * @param username Username.
 * @param password Password.
 * @returns Login response and Cookie header value.
 */
async function loginWithLdapApi(request: APIRequestContext, username: string, password: string): Promise<{ response: APIResponse; cookie: string }> {
  const response = await request.post(`${ID_API_URL}/authorise/ldap`, { data: { username, password }, failOnStatusCode: false });
  const cookie = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value.split(';')[0])
    .join('; ');
  debug(`loginWithLdapApi: ${username} -> ${response.status()}`);
  return { response, cookie };
}

/**
 * Checks the session on id-api. 200 means the session is still valid.
 * @param request Request context.
 * @param cookie Cookie header value.
 * @returns Status and body.
 */
async function getIdSession(request: APIRequestContext, cookie: string): Promise<{ status: number; body: any }> {
  const response = await request.get(`${ID_API_URL}/auth`, { headers: { Cookie: cookie }, failOnStatusCode: false });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status(), body };
}

/**
 * Asks id-api to check the user against the directory right away and revoke the access if it is lost.
 * Uses its own request context without cookies, like a service would: a request that carries the user's own
 * session cookie would save that session back after the revocation deleted it.
 * @param userId Liquio user id.
 * @returns Status and body.
 */
async function syncLdapUser(userId: string): Promise<{ status: number; body: any }> {
  const context = await playwrightRequest.newContext();
  try {
    const response = await context.post(`${ID_API_URL}/user/ldap/sync/${userId}`, {
      headers: { Authorization: getIdApiBasicAuth() },
      failOnStatusCode: false,
    });
    const body = await response.json().catch((): undefined => undefined);
    debug(`syncLdapUser: ${userId} -> ${response.status()} ${JSON.stringify(body)}`);
    return { status: response.status(), body };
  } finally {
    await context.dispose();
  }
}

export {
  ID_API_URL,
  ACCESS_GROUP,
  UNIT_GROUP,
  userDn,
  ldapModify,
  seedDirectory,
  addToGroup,
  removeFromGroup,
  resetLoginAttempts,
  psql,
  getIdApiBasicAuth,
  isLdapProviderEnabled,
  loginWithLdapApi,
  getIdSession,
  syncLdapUser,
};
