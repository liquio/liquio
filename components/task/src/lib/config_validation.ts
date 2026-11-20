// SHA-256 hashes of Basic tokens that were committed to the repository (config-templates/task/basic_auth.json,
// helm-chart task.configmap.yaml). They are public, so they must never be accepted, whatever config the service gets.
export const KNOWN_DEFAULT_BASIC_TOKEN_HASHES: string[] = ['352a5ebad68451c31cf4b273767b05d5c9c55216cf9459a2215edf2b1f9784fc'];

export const PRODUCTION_ENV = 'production';

/**
 * Build the Sandbox config. Template JavaScript must never run outside isolated-vm, so the isolation level is not
 * configurable: a configured `function` level (host-realm `new Function`) is overridden and reported.
 * @param {Record<string, any>} [sandboxConfig] The `sandbox` section of the config.
 * @param {(message: string) => void} [warn] Warning writer.
 * @returns {Record<string, any>} Sandbox config with a forced isolation level.
 */
export function buildSandboxConfig(
  sandboxConfig: Record<string, any> = {},
  warn: (message: string) => void = (message) => console.warn(message),
): Record<string, any> {
  const requested = sandboxConfig?.isolationLevel;
  if (requested !== undefined && requested !== 'isolated-vm') {
    warn(`sandbox-unsafe-function-level: sandbox.isolationLevel "${requested}" is not supported, using "isolated-vm"`);
  }

  return { ...sandboxConfig, isolationLevel: 'isolated-vm' };
}

// Placeholder secrets committed to config templates or commonly left as defaults.
export const PLACEHOLDER_SECRETS = ['<removed>', 'redacted', 'changeme', 'secret'];
export const MIN_DOWNLOAD_TOKEN_SECRET_LENGTH = 16;

/**
 * Check a download token signing secret. Refuses empty, placeholder (`<...>`, REDACTED, changeme, ...) and short values.
 * @param {any} secret Secret from config.
 * @returns {string|null} Problem description or null.
 */
export function checkDownloadTokenSecret(secret: any): string | null {
  if (typeof secret !== 'string' || !secret.trim()) {
    return 'download_token.jwtSecret is empty: provide download_token.json with a random secret';
  }

  const normalized = secret.trim().toLowerCase();
  if (/^<.*>$/.test(normalized) || PLACEHOLDER_SECRETS.includes(normalized)) {
    return 'download_token.jwtSecret is a placeholder, generate a random secret (scripts/init.sh does it)';
  }
  if (secret.length < MIN_DOWNLOAD_TOKEN_SECRET_LENGTH) {
    return `download_token.jwtSecret is too short, use at least ${MIN_DOWNLOAD_TOKEN_SECRET_LENGTH} characters`;
  }

  return null;
}

export const TEST_AUTH_PRODUCTION_OVERRIDE_ENV = 'ALLOW_TEST_AUTH_IN_PRODUCTION';
export const MIN_TEST_USER_TOKEN_LENGTH = 16;
export const TEST_AUTH_FLAGS = ['allowedTestAuth', 'allowedTestSign', 'allowedTestPem'];

/**
 * Collect warnings about the test-user bypass (auth.allowedTestAuth / allowedTestSign / allowedTestPem + test_users.list)
 * explicitly allowed in production via ALLOW_TEST_AUTH_IN_PRODUCTION=true. The fatal rules live in the config schema.
 * allowedTestPem is inert while test_users is empty, so it counts only together with a non-empty list.
 * @param {Record<string, any>} config Config object.
 * @param {string} [env] Node environment.
 * @param {string} [override] Value of ALLOW_TEST_AUTH_IN_PRODUCTION.
 * @returns {string[]} Warnings.
 */
export function findTestAuthWarnings(
  config: Record<string, any>,
  env: string | undefined = process.env.NODE_ENV,
  override: string | undefined = process.env[TEST_AUTH_PRODUCTION_OVERRIDE_ENV],
): string[] {
  const list = config?.test_users?.list;
  const users: any[] = Array.isArray(list) ? list : [];
  const enabled = TEST_AUTH_FLAGS.filter((flag) => config?.auth?.[flag] === true && (flag !== 'allowedTestPem' || users.length > 0));

  if (enabled.length && env === PRODUCTION_ENV && override === 'true') {
    return [`test-auth-in-production: auth.${enabled.join(', auth.')} enabled via ${TEST_AUTH_PRODUCTION_OVERRIDE_ENV}`];
  }

  return [];
}
