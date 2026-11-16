import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { debug } from './debug';

const ID_API_URL = 'http://localhost:8100';
const TASK_AUTH_CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'task', 'auth.json');

/**
 * Reads the Basic Auth header that task uses to call the service-to-service routes of id-api.
 *
 * @returns Value for the `Authorization` header
 * @throws If the token is missing in the task auth config
 */
function getTaskIdApiBasicAuthHeader(): string {
  const { LiquioId } = JSON.parse(fs.readFileSync(TASK_AUTH_CONFIG_PATH, 'utf8'));
  const token: string | undefined = LiquioId?.basicAuthToken;
  if (!token) {
    throw new Error(`LiquioId.basicAuthToken is missing in ${TASK_AUTH_CONFIG_PATH}`);
  }
  return token.startsWith('Basic ') ? token : `Basic ${token}`;
}

/**
 * Runs one query in the id database through psql in the postgres container.
 * Values go in as psql variables through stdin, never spliced into the SQL text.
 */
function runIdQuery(query: string, vars: Record<string, string>): string {
  const names = Object.keys(vars);
  const flags = names.map((name, index) => `-v ${name}="$${index + 1}"`).join(' ');
  return execFileSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'sh',
      '-c',
      `psql -U "$POSTGRES_USER" -d id -At -v ON_ERROR_STOP=1 ${flags}`,
      'sh',
      ...names.map((name) => vars[name]),
    ],
    { input: query, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' },
  ).trim();
}

/**
 * Sets the email of a user directly in the id database (fixture setup, no id-api endpoint changes an arbitrary email).
 *
 * @param userId - Target user id
 * @param email - Email to set, `null` clears it
 */
function setUserEmail(userId: string, email: string | null): void {
  debug(`setUserEmail: userId=${userId} email=${email}`);
  runIdQuery("UPDATE users SET email = NULLIF(:'email', '') WHERE \"userId\" = :'user_id';", { email: email ?? '', user_id: userId });
}

/**
 * Reads the email of a user from the id database.
 *
 * @param userId - Target user id
 * @returns Email or `null` if it is empty
 */
function getUserEmail(userId: string): string | null {
  const email = runIdQuery('SELECT email FROM users WHERE "userId" = :\'user_id\';', { user_id: userId });
  debug(`getUserEmail: userId=${userId} email=${email || null}`);
  return email || null;
}

/**
 * Picks a user id different from the given one.
 *
 * @param excludeUserId - User id to exclude
 * @returns Another user id
 * @throws If there is no other user
 */
function pickOtherUserId(excludeUserId: string): string {
  const userId = runIdQuery('SELECT "userId" FROM users WHERE "userId" <> :\'user_id\' ORDER BY "userId" LIMIT 1;', { user_id: excludeUserId });
  debug(`pickOtherUserId: picked ${userId}`);
  if (!userId) {
    throw new Error('No other user found in the id database');
  }
  return userId;
}

export { ID_API_URL, getTaskIdApiBasicAuthHeader, setUserEmail, getUserEmail, pickOtherUserId };
