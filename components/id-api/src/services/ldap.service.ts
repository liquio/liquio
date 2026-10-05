import fs from 'node:fs';

import * as ldapts from 'ldapts';

import { LdapProviderConfig } from '../config';
import { BaseService } from './base_service';

// Reference: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties
export enum UserAccountControl {
  ACCOUNTDISABLE = 2,
  LOCKOUT = 16,
}

const DEFAULT_ID_ATTRIBUTE = 'objectGUID';
const DEFAULT_USER_FILTER = '(&(objectClass=user)(|(sAMAccountName={{username}})(userPrincipalName={{username}})))';
const USERNAME_PLACEHOLDER = '{{username}}';

// LDAP_MATCHING_RULE_IN_CHAIN, resolves nested group membership on the server side.
const MATCHING_RULE_IN_CHAIN = '1.2.840.113556.1.4.1941';

// Attributes that hold binary values and have to be requested as Buffers.
const BINARY_ATTRIBUTES = ['objectguid', 'objectsid'];

// accountExpires: 0 and the max int64 both mean "never expires".
const FILETIME_NEVER = BigInt('0x7FFFFFFFFFFFFFFF');
const FILETIME_EPOCH_DIFF_MS = 11644473600000;

/// More than one directory entry matched the login or id.
export class LdapAmbiguousUserError extends Error {
  constructor() {
    super('Many users found.');
    this.name = 'LdapAmbiguousUserError';
  }
}

type EntryValue = ldapts.Entry[string];

// RFC 4515 escaping of an assertion value.
export function escapeFilterValue(value: string | Buffer): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  let result = '';
  for (const byte of buffer) {
    const isSafe = byte >= 0x20 && byte < 0x7f && ![0x28, 0x29, 0x2a, 0x5c].includes(byte);
    result += isSafe ? String.fromCharCode(byte) : `\\${byte.toString(16).padStart(2, '0')}`;
  }
  return result;
}

// DNs are case-insensitive and may differ in whitespace around separators.
export function normalizeDn(dn: string): string {
  return dn
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*=\s*/g, '=');
}

export class LdapService extends BaseService {
  private readonly cfg?: LdapProviderConfig;
  private client?: ldapts.Client;
  private connecting?: Promise<ldapts.Client>;
  private tlsOptions?: Record<string, unknown>;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.auth_providers?.ldap;
  }

  get isEnabled(): boolean {
    return Boolean(this.cfg?.isEnabled && this.cfg?.connection?.url);
  }

  get idAttribute(): string {
    return this.cfg?.idAttribute || DEFAULT_ID_ATTRIBUTE;
  }

  async init() {
    if (!this.isEnabled) {
      return;
    }

    // Warm up only: an unreachable directory must not block id-api startup, the next search reconnects.
    await this.getClient().catch((error: any) => {
      this.log.save('ldap-init-connect-fail', { error: error.toString() }, 'warning');
    });
  }

  async stop() {
    await this.disconnect();
  }

  /// Find the user by login using userSearchBase and userFilter. Returns null if nothing found.
  async findUser(username: string): Promise<ldapts.Entry | null> {
    this.assertEnabled();

    if (typeof username !== 'string' || !username.trim()) {
      return null;
    }

    const template = this.cfg?.userFilter || DEFAULT_USER_FILTER;
    const filter = template.split(USERNAME_PLACEHOLDER).join(escapeFilterValue(username));

    this.log.save('ldap-find-user', { username });

    return this.searchSingleUser('ldap-find-user', filter, { username });
  }

  /// Find the user by the idAttribute value, in the form produced by getUserId (hex for binary attributes).
  async findUserById(id: string): Promise<ldapts.Entry | null> {
    this.assertEnabled();

    if (typeof id !== 'string' || !id.trim()) {
      return null;
    }

    let value: string;
    if (this.isBinaryAttribute(this.idAttribute)) {
      if (!/^([0-9a-f]{2})+$/i.test(id)) {
        this.log.save('ldap-find-user-by-id-invalid', { id }, 'error');
        return null;
      }
      value = id.replace(/../g, (pair) => `\\${pair.toLowerCase()}`);
    } else {
      value = escapeFilterValue(id);
    }

    const filter = `(&(objectClass=user)(${this.idAttribute}=${value}))`;

    this.log.save('ldap-find-user-by-id', { id });

    return this.searchSingleUser('ldap-find-user-by-id', filter, { id });
  }

  /// Return the stable user id: hex for binary (Buffer) values, string otherwise.
  getUserId(entry: ldapts.Entry): string {
    const raw = entry[this.idAttribute];
    const value: unknown = Array.isArray(raw) ? raw[0] : raw;

    if (Buffer.isBuffer(value)) {
      return value.toString('hex');
    }
    if (typeof value === 'string' && value) {
      return value;
    }

    throw new Error(`LDAP entry has no ${this.idAttribute} attribute.`);
  }

  /// Check the user password with a bind on a separate short-lived connection.
  async verifyPassword(dn: string, password: string): Promise<boolean> {
    this.assertEnabled();

    // An empty password turns the bind into an anonymous (unauthenticated) one, which succeeds on AD.
    if (typeof dn !== 'string' || !dn.trim() || typeof password !== 'string' || !password.trim()) {
      this.log.save('ldap-verify-password-empty', { dn }, 'error');
      return false;
    }

    const client = this.createClient();

    try {
      await this.startTlsIfNeeded(client);
      await client.bind(dn, password);
      return true;
    } catch (error: any) {
      if (error instanceof ldapts.InvalidCredentialsError) {
        this.log.save('ldap-verify-password-invalid', { dn });
        return false;
      }
      this.log.save('ldap-verify-password-fail', { dn, error: error.toString() }, 'error');
      throw error;
    } finally {
      try {
        await client.unbind();
      } catch {
        // Nothing to do, the connection is already gone.
      }
    }
  }

  /// Return DNs of the groups the user belongs to.
  async getUserGroups(entry: ldapts.Entry): Promise<string[]> {
    this.assertEnabled();

    if (!this.cfg?.nestedGroups) {
      return this.toStringArray(entry.memberOf);
    }

    const filter = `(&(objectClass=group)(member:${MATCHING_RULE_IN_CHAIN}:=${escapeFilterValue(entry.dn)}))`;

    try {
      const { searchEntries } = await this.search(this.cfg?.baseDN || '', {
        scope: 'sub',
        filter,
        attributes: ['dn'],
        paged: true,
      });
      return searchEntries.map((group) => group.dn);
    } catch (error: any) {
      this.log.save('ldap-get-user-groups-fail', { dn: entry.dn, error: error.toString() }, 'error');
      throw error;
    }
  }

  /// True if the account is disabled, locked out or expired.
  /// Lockout is read from the computed attribute (it accounts for the lockout duration), not from lockoutTime,
  /// which stays non-zero after the lockout has expired.
  isAccountDisabled(entry: ldapts.Entry): boolean {
    const flags = UserAccountControl.ACCOUNTDISABLE | UserAccountControl.LOCKOUT;
    const control = Number(this.toStringArray(entry.userAccountControl)[0]);
    if (Number.isFinite(control) && control & flags) {
      return true;
    }

    const computed = Number(this.toStringArray(entry['msDS-User-Account-Control-Computed'])[0]);
    if (Number.isFinite(computed) && computed & UserAccountControl.LOCKOUT) {
      return true;
    }

    const [expires] = this.toStringArray(entry.accountExpires);
    if (!expires || !/^\d+$/.test(expires)) {
      return false;
    }

    const filetime = BigInt(expires);
    if (filetime === BigInt(0) || filetime === FILETIME_NEVER) {
      return false;
    }

    return Number(filetime / BigInt(10000)) - FILETIME_EPOCH_DIFF_MS < Date.now();
  }

  /// Return the subset of the given group DNs that exist in the directory.
  /// Uses one base-scope search per DN: the DN is the search base, so it is never put into a filter.
  async groupsExist(dns: string[]): Promise<string[]> {
    this.assertEnabled();

    const existing: string[] = [];

    for (const dn of dns) {
      try {
        const { searchEntries } = await this.search(dn, {
          scope: 'base',
          filter: '(objectClass=*)',
          attributes: ['dn'],
        });
        if (searchEntries.length > 0) {
          existing.push(dn);
        }
      } catch (error: any) {
        if (error instanceof ldapts.NoSuchObjectError) {
          this.log.save('ldap-group-not-found', { dn }, 'error');
          continue;
        }
        this.log.save('ldap-groups-exist-fail', { dn, error: error.toString() }, 'error');
        throw error;
      }
    }

    return existing;
  }

  /// Compare two DNs ignoring case and whitespace around separators.
  isSameDn(a: string, b: string): boolean {
    return normalizeDn(a) === normalizeDn(b);
  }

  private assertEnabled() {
    if (!this.isEnabled) {
      throw new Error('LDAP provider is not enabled.');
    }
  }

  private isBinaryAttribute(attribute: string): boolean {
    return BINARY_ATTRIBUTES.includes(attribute.toLowerCase());
  }

  private toStringArray(value: EntryValue | undefined): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list.map((item) => (Buffer.isBuffer(item) ? item.toString('utf8') : String(item)));
  }

  private async searchSingleUser(logKey: string, filter: string, logData: Record<string, unknown>): Promise<ldapts.Entry | null> {
    const attributes = new Set([
      'dn',
      this.idAttribute,
      'userAccountControl',
      'accountExpires',
      'memberOf',
      'sAMAccountName',
      'userPrincipalName',
      'cn',
      'msDS-User-Account-Control-Computed',
      ...Object.values(this.cfg?.attributes || {}),
    ]);

    try {
      const { searchEntries } = await this.search(this.cfg?.userSearchBase || this.cfg?.baseDN || '', {
        scope: 'sub',
        filter,
        attributes: [...attributes],
        explicitBufferAttributes: this.isBinaryAttribute(this.idAttribute) ? [this.idAttribute] : [],
      });

      if (searchEntries.length === 0) {
        this.log.save(`${logKey}-not-found`, logData);
        return null;
      }
      if (searchEntries.length > 1) {
        this.log.save(`${logKey}-many`, { ...logData, count: searchEntries.length }, 'error');
        throw new LdapAmbiguousUserError();
      }

      return searchEntries[0];
    } catch (error: any) {
      this.log.save(`${logKey}-fail`, { ...logData, error: error.toString() }, 'error');
      throw error;
    }
  }

  // Search with the service account. A connection-level error (anything but an LDAP result code) triggers one reconnect and retry.
  private async search(base: string, options: ldapts.SearchOptions): Promise<ldapts.SearchResult> {
    const client = await this.getClient();

    try {
      return await client.search(base, options);
    } catch (error: any) {
      if (error instanceof ldapts.ResultCodeError) {
        throw error;
      }

      this.log.save('ldap-search-reconnect', { error: error.toString() }, 'error');
      await this.disconnect();
      const freshClient = await this.getClient();
      return freshClient.search(base, options);
    }
  }

  private async getClient(): Promise<ldapts.Client> {
    if (this.client?.isConnected) {
      return this.client;
    }

    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = undefined;
      });
    }
    return this.connecting;
  }

  private async connect(): Promise<ldapts.Client> {
    await this.disconnect();

    const client = this.createClient();

    try {
      await this.startTlsIfNeeded(client);
      await client.bind(this.cfg?.connection?.bindDN || '', this.cfg?.connection?.bindPassword || '');
    } catch (error: any) {
      this.log.save('ldap-connect-fail', { error: error.toString() }, 'error');
      try {
        await client.unbind();
      } catch {
        // Nothing to do, the connection is already gone.
      }
      throw error;
    }

    this.client = client;
    this.log.save('ldap-connect-success');
    return client;
  }

  private async disconnect() {
    const client = this.client;
    this.client = undefined;

    if (client) {
      try {
        await client.unbind();
      } catch {
        // Nothing to do, the connection is already gone.
      }
    }
  }

  private createClient(): ldapts.Client {
    const connection = this.cfg?.connection;

    return new ldapts.Client({
      url: connection?.url || '',
      timeout: connection?.timeout,
      connectTimeout: connection?.connectTimeout,
      tlsOptions: this.getTlsOptions(),
    });
  }

  private async startTlsIfNeeded(client: ldapts.Client) {
    if (this.cfg?.connection?.startTLS && !this.cfg.connection.url?.toLowerCase().startsWith('ldaps:')) {
      await client.startTLS(this.getTlsOptions());
    }
  }

  // The CA may be given as a PEM string or as a path to a PEM file.
  private getTlsOptions(): Record<string, unknown> | undefined {
    if (this.tlsOptions) {
      return this.tlsOptions;
    }

    const tls = this.cfg?.connection?.tlsOptions;
    if (!tls) {
      return undefined;
    }

    const options: Record<string, unknown> = {};
    if (tls.ca) {
      options.ca = tls.ca.includes('-----BEGIN') ? tls.ca : fs.readFileSync(tls.ca);
    }
    if (tls.rejectUnauthorized !== undefined) {
      options.rejectUnauthorized = tls.rejectUnauthorized;
    }

    this.tlsOptions = options;
    return options;
  }
}
