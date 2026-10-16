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
