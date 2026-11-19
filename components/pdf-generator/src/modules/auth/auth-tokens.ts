import { createHash, timingSafeEqual } from 'node:crypto';

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

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
