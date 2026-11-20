/** Placeholder left in config templates for secrets. */
export const PLACEHOLDER = '<REDACTED>';
/** Environment where placeholder secrets are tolerated. */
export const DEV_ENVIRONMENT = 'dev';

// Always supplied by Helm (admin-api Secret) and scripts/init.sh, and always used at runtime: fail closed outside of `dev`.
export const CHECKED_SECRET_PATHS = [
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
// Checked only when the optional `db.slave` read replica is configured (index.ts connects to it only in that case).
export const SLAVE_DB_SECRET_PATHS = ['db.slave.password'];

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
  const paths = config?.db?.slave ? [...CHECKED_SECRET_PATHS, ...SLAVE_DB_SECRET_PATHS] : CHECKED_SECRET_PATHS;
  return filterPlaceholders(config, paths);
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

// SHA-256 hashes of task Basic tokens that were committed to the repository (config-templates/admin-api/task.json,
// helm-chart admin-api.configmap.yaml). They are public, so they must never be sent to or accepted from the task service.
export const KNOWN_DEFAULT_TASK_TOKEN_HASHES: string[] = ['352a5ebad68451c31cf4b273767b05d5c9c55216cf9459a2215edf2b1f9784fc'];
