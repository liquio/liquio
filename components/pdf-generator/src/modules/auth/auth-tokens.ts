import { createHash, timingSafeEqual } from 'crypto';

// Constants.
const BASIC_PREFIX = 'Basic ';

// Credentials that used to ship in config/auth.json.default and are publicly known.
const KNOWN_DEFAULT_CREDENTIALS = ['username:password'];

/**
 * Validates configured Basic auth tokens. Throws without including the token values in the message.
 * @param {unknown} tokens - Value of `auth.basicAuthTokens` from the config.
 */
export function assertValidBasicAuthTokens(tokens: unknown): asserts tokens is string[] {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error(
      'Auth config: "basicAuthTokens" must contain at least one token. ' +
        'Provide config/auth.json or the KITSOFT_PDF_GENERATOR_auth environment variable.',
    );
  }

  tokens.forEach((token, index) => {
    const credentials = decodeBasicToken(token);
    if (credentials === null) {
      throw new Error(`Auth config: basicAuthTokens[${index}] must be "Basic <base64(user:password)>"`);
    }

    if (KNOWN_DEFAULT_CREDENTIALS.includes(credentials)) {
      throw new Error(`Auth config: basicAuthTokens[${index}] uses publicly known default credentials`);
    }

    const password = credentials.slice(credentials.indexOf(':') + 1);
    if (password.length === 0) {
      throw new Error(`Auth config: basicAuthTokens[${index}] password must not be empty`);
    }
  });
}

/**
 * Compares a presented token with the allowed ones in constant time.
 * @param {string} token - Presented token in the `Basic <base64>` form.
 * @param {string[]} allowedTokens - Configured tokens.
 * @returns {boolean} True if the token is allowed.
 */
export function isBasicAuthTokenAllowed(token: string, allowedTokens: string[]): boolean {
  const tokenDigest = digest(token);

  // Do not short-circuit, so timing does not reveal which configured token matched.
  return allowedTokens.reduce((isAllowed, allowedToken) => timingSafeEqual(tokenDigest, digest(allowedToken)) || isAllowed, false);
}

function decodeBasicToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token.startsWith(BASIC_PREFIX)) {
    return null;
  }

  const credentials = Buffer.from(token.slice(BASIC_PREFIX.length), 'base64').toString('utf8');

  return credentials.includes(':') ? credentials : null;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
