import crypto from 'node:crypto';

const PLACEHOLDER = '<REDACTED>';
const DEV_ENVIRONMENT = 'dev';

// Always supplied by Helm (admin-api Secret) and scripts/init.sh, and always used at runtime: fail closed outside of `dev`.
const CHECKED_SECRET_PATHS = [
  'notifier.password',
  'server.token',
  'server.crypto.password',
  'server.crypto.iv',
  'db.password',
  'auth.jwtSecret',
  'auth.basicAuthToken',
];

// Supplied by Helm but not by scripts/init.sh, and used only on some flows (id-api code/refresh exchange, `sign` encryption
// of assets): a correct install may leave the placeholder, so these only produce a warning.
const WARNED_SECRET_PATHS = ['auth.clientSecret', 'sign.token'];

/**
 * Get nested value by dotted path.
 * @param {Record<string, any>} config Config.
 * @param {string} path Dotted path.
 * @returns {any} Value.
 */
function getByPath(config: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), config);
}

/**
 * Find secrets that are empty or still equal to the `<REDACTED>` placeholder from config templates.
 * @param {Record<string, any>} config Config.
 * @returns {string[]} Config paths with missing secrets.
 */
export function findPlaceholderSecrets(config: Record<string, any>): string[] {
  return filterPlaceholders(config, CHECKED_SECRET_PATHS);
}

/**
 * Find warn-only secrets that are empty or still equal to the `<REDACTED>` placeholder. Never fatal.
 * @param {Record<string, any>} config Config.
 * @returns {string[]} Config paths with placeholder secrets.
 */
export function findPlaceholderSecretWarnings(config: Record<string, any>): string[] {
  return filterPlaceholders(config, WARNED_SECRET_PATHS);
}

/**
 * Filter config paths whose value is missing, empty or the placeholder.
 * @param {Record<string, any>} config Config.
 * @param {string[]} paths Dotted paths.
 * @returns {string[]} Offending paths.
 */
function filterPlaceholders(config: Record<string, any>, paths: string[]): string[] {
  return paths.filter((path) => {
    const value = getByPath(config, path);
    return value === undefined || value === null || (typeof value === 'string' && (value.trim() === '' || value.trim() === PLACEHOLDER));
  });
}

/**
 * Fail fast when secrets are placeholders or empty outside of the `dev` environment.
 * @param {Record<string, any>} config Config.
 * @returns {string[]} Offending config paths (non-empty only in `dev`, where startup is allowed).
 * @throws {Error} Outside of `dev` environment when any secret is a placeholder or empty.
 */
export function assertNoPlaceholderSecrets(config: Record<string, any>): string[] {
  const offending = findPlaceholderSecrets(config);
  if (offending.length > 0 && config?.server?.environment !== DEV_ENVIRONMENT) {
    throw new Error(
      `Config secrets must be set (not empty or "${PLACEHOLDER}") outside of "${DEV_ENVIRONMENT}" environment: ${offending.join(', ')}.`,
    );
  }
  return offending;
}

// SHA-256 hashes of task Basic tokens that were committed to the repository (config-templates/admin-api/task.json,
// helm-chart admin-api.configmap.yaml). They are public, so they must never be sent to or accepted from the task service.
export const KNOWN_DEFAULT_TASK_TOKEN_HASHES: string[] = ['352a5ebad68451c31cf4b273767b05d5c9c55216cf9459a2215edf2b1f9784fc'];

/**
 * Fail fast when the token for the task service is a publicly known default,
 * or is empty outside of the `dev` environment.
 * @param {Record<string, any>} config Config.
 * @throws {Error} When the task token is a known default, or empty outside of `dev`.
 */
export function assertTaskTokenIsNotDefault(config: Record<string, any>): void {
  const token = config?.task?.token;

  if (typeof token !== 'string' || token.trim() === '') {
    if (config?.server?.environment !== DEV_ENVIRONMENT) {
      throw new Error(`Config "task.token" must be set outside of "${DEV_ENVIRONMENT}" environment.`);
    }
    return;
  }

  const normalizedToken = token.trim().startsWith('Basic ') ? token.trim() : `Basic ${token.trim()}`;
  const hash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
  if (KNOWN_DEFAULT_TASK_TOKEN_HASHES.includes(hash)) {
    throw new Error('Config "task.token" is a publicly known default token from the repository, rotate it.');
  }
}
