import crypto from 'node:crypto';

// SHA-256 hashes of Basic tokens that were committed to the repository (config-templates/task/basic_auth.json,
// helm-chart task.configmap.yaml). They are public, so they must never be accepted, whatever config the service gets.
export const KNOWN_DEFAULT_BASIC_TOKEN_HASHES: string[] = ['352a5ebad68451c31cf4b273767b05d5c9c55216cf9459a2215edf2b1f9784fc'];

const PRODUCTION_ENV = 'production';

/**
 * Check one Basic token.
 * @param {any} token Token from config.
 * @param {number} index Token index in config.
 * @returns {string|null} Problem description or null.
 */
function checkToken(token: any, index: number): string | null {
  const label = `basic_auth.tokens[${index}]`;

  if (typeof token !== 'string') {
    return `${label} is not a string`;
  }

  const normalizedToken = token.startsWith('Basic ') ? token : `Basic ${token}`;
  const hash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
  if (KNOWN_DEFAULT_BASIC_TOKEN_HASHES.includes(hash)) {
    return `${label} is a publicly known default token from the repository, rotate it`;
  }

  const credentials = Buffer.from(normalizedToken.slice('Basic '.length), 'base64').toString('utf8').split(':');
  if (credentials.length !== 2 || !credentials[0] || !credentials[1]) {
    return `${label} does not contain non-empty "user:password"`;
  }
  if (credentials[0] === credentials[1]) {
    return `${label} has the password equal to the user name`;
  }

  return null;
}

/**
 * Validate basic_auth config. Service must not start with a known default token.
 * An empty list is refused only in production, where the admin-api and external services need a token.
 * @param {Record<string, any>} config Config object.
 * @param {string} [env] Node environment.
 * @returns {string[]} List of problems, empty if config is valid.
 */
export function validateBasicAuthConfig(config: Record<string, any>, env: string | undefined = process.env.NODE_ENV): string[] {
  const tokens = config?.basic_auth?.tokens;

  if (!Array.isArray(tokens)) {
    return ['basic_auth.tokens must be an array'];
  }
  if (!tokens.length) {
    return env === PRODUCTION_ENV
      ? ['basic_auth.tokens is empty: provide basic_auth.json (or SECRET_PATH / env config) with environment-specific tokens']
      : [];
  }

  return tokens.map(checkToken).filter((problem): problem is string => problem !== null);
}

/**
 * Throw when basic_auth config is invalid.
 * @param {Record<string, any>} config Config object.
 * @param {string} [env] Node environment.
 */
export function assertBasicAuthConfig(config: Record<string, any>, env: string | undefined = process.env.NODE_ENV): void {
  const problems = validateBasicAuthConfig(config, env);
  if (problems.length) {
    throw new Error(`Invalid basic_auth config: ${problems.join('; ')}`);
  }
}

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
const PLACEHOLDER_SECRETS = ['<removed>', 'redacted', 'changeme', 'secret'];
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

/**
 * Throw when download_token config has no usable signing secret.
 * @param {Record<string, any>} config Config object.
 */
export function assertDownloadTokenConfig(config: Record<string, any>): void {
  const problem = checkDownloadTokenSecret(config?.download_token?.jwtSecret);
  if (problem) {
    throw new Error(`Invalid download_token config: ${problem}`);
  }
}

export const TEST_AUTH_PRODUCTION_OVERRIDE_ENV = 'ALLOW_TEST_AUTH_IN_PRODUCTION';
export const MIN_TEST_USER_TOKEN_LENGTH = 16;
const TEST_AUTH_FLAGS = ['allowedTestAuth', 'allowedTestSign', 'allowedTestPem'];

/**
 * Validate the test-user bypass (auth.allowedTestAuth / allowedTestSign / allowedTestPem + test_users.list).
 * Each flag lets a request with a `test_users` token skip real authentication, signing or PEM checks, so in production
 * it is refused unless ALLOW_TEST_AUTH_IN_PRODUCTION=true. allowedTestPem is true in the templates but inert while
 * test_users is empty, so it is refused only together with a non-empty list. Test tokens must be long and non-placeholder.
 * @param {Record<string, any>} config Config object.
 * @param {string} [env] Node environment.
 * @param {string} [override] Value of ALLOW_TEST_AUTH_IN_PRODUCTION.
 * @returns {{ problems: string[], warnings: string[] }} Problems (fatal) and warnings.
 */
export function validateTestAuthConfig(
  config: Record<string, any>,
  env: string | undefined = process.env.NODE_ENV,
  override: string | undefined = process.env[TEST_AUTH_PRODUCTION_OVERRIDE_ENV],
): { problems: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const list = config?.test_users?.list;
  const users: any[] = Array.isArray(list) ? list : [];
  const enabled = TEST_AUTH_FLAGS.filter((flag) => config?.auth?.[flag] === true && (flag !== 'allowedTestPem' || users.length > 0));

  if (!enabled.length) {
    return { problems, warnings };
  }

  const isProduction = env === PRODUCTION_ENV;
  if (isProduction && override !== 'true') {
    problems.push(
      `auth.${enabled.join(', auth.')} enabled in production: test_users tokens would bypass authentication. ` +
        `Disable it, or set ${TEST_AUTH_PRODUCTION_OVERRIDE_ENV}=true to override explicitly`,
    );
  } else if (isProduction) {
    warnings.push(`test-auth-in-production: auth.${enabled.join(', auth.')} enabled via ${TEST_AUTH_PRODUCTION_OVERRIDE_ENV}`);
  }

  users.forEach((user, index) => {
    const token = user?.token;
    const label = `test_users.list[${index}].token`;
    if (typeof token !== 'string' || token.trim().length < MIN_TEST_USER_TOKEN_LENGTH) {
      problems.push(`${label} is missing or shorter than ${MIN_TEST_USER_TOKEN_LENGTH} characters`);
    } else if (/^<.*>$/.test(token.trim().toLowerCase()) || PLACEHOLDER_SECRETS.includes(token.trim().toLowerCase())) {
      problems.push(`${label} is a placeholder`);
    }
  });

  return { problems, warnings };
}

/**
 * Throw when the test-user bypass is enabled unsafely; log a warning when it is explicitly allowed in production.
 * @param {Record<string, any>} config Config object.
 * @param {string} [env] Node environment.
 * @param {string} [override] Value of ALLOW_TEST_AUTH_IN_PRODUCTION.
 * @param {(message: string) => void} [warn] Warning writer.
 */
export function assertTestAuthConfig(
  config: Record<string, any>,
  env: string | undefined = process.env.NODE_ENV,
  override: string | undefined = process.env[TEST_AUTH_PRODUCTION_OVERRIDE_ENV],
  warn: (message: string) => void = (message) => console.warn(message),
): void {
  const { problems, warnings } = validateTestAuthConfig(config, env, override);
  warnings.forEach(warn);
  if (problems.length) {
    throw new Error(`Invalid test auth config: ${problems.join('; ')}`);
  }
}
