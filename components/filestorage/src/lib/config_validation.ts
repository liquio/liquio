import crypto from 'node:crypto';

// SHA-256 hashes of tokens that were committed to config-templates/filestorage/auth.json.
// They are public, so they must never be accepted, whatever config the service is started with.
export const COMPROMISED_TOKEN_HASHES: string[] = [
  '55f73f4e50eb6ed8e1538dc7fd3298327c648104d1afc1e29f1a6e662fb5277d',
  '4836cc9400320806e418b862701b65df74651c3f2c8a2e089011012e3dce2b23',
  // CE-only: "Basic dGVzdDE6dGVzdA==" (test1:test), shipped in config-templates and the swagger example.
  '351edb1f834c66257939baa1530fad4c4aa4a4109d753b1e068c10c373343568',
];

/**
 * Check one auth token.
 * @param {any} token Token from config.
 * @param {number} index Token index in config.
 * @returns {string|null} Problem description or null.
 */
function checkToken(token: any, index: number): string | null {
  const label = `auth.tokens[${index}]`;

  if (typeof token !== 'string') {
    return `${label} is not a string`;
  }

  const [keyword, base64Part, ...rest] = token.split(' ');
  if (keyword !== 'Basic' || !base64Part || rest.length) {
    return `${label} is not in "Basic <base64(user:password)>" format`;
  }

  const credentials = Buffer.from(base64Part, 'base64').toString('utf8').split(':');
  if (credentials.length !== 2 || !credentials[0] || !credentials[1]) {
    return `${label} does not contain non-empty "user:password"`;
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (COMPROMISED_TOKEN_HASHES.includes(hash)) {
    return `${label} is a publicly known token from the repository, rotate it`;
  }

  return null;
}

/**
 * Validate auth config. Service must not start without real secrets.
 * @param {Record<string, any>} config Config object.
 * @returns {string[]} List of problems, empty if config is valid.
 */
export function validateAuthConfig(config: Record<string, any>): string[] {
  const tokens = config?.auth?.tokens;

  if (!Array.isArray(tokens) || !tokens.length) {
    return ['auth.tokens is empty: provide auth.json (or LIQUIO_CFG_FILESTORAGE_auth env / SECRET_PATH) with environment-specific tokens'];
  }

  return tokens.map(checkToken).filter((problem): problem is string => problem !== null);
}
