const PLACEHOLDER = '<REDACTED>';
const DEV_ENVIRONMENT = 'dev';

const CHECKED_SECRET_PATHS = ['notifier.password', 'server.token', 'server.crypto.password', 'server.crypto.iv'];

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
  return CHECKED_SECRET_PATHS.filter((path) => {
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
