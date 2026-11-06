import { createHash } from 'node:crypto';

/** Minimum length of the password part of a `user:password` token. */
export const MIN_TOKEN_PASSWORD_LENGTH = 8;

// SHA-256 of the `user:password` token that used to ship in config-templates (`username:password`).
// Stored as a hash so the check does not itself publish a credential. Refused in every environment.
export const KNOWN_DEFAULT_TOKEN_HASHES: string[] = ['bc842c31a9e54efe320d30d948be61291f3ceee4766e36ab25fa65243cd76e0e'];

const PLACEHOLDER_RE = /<?\bREDACTED\b>?|<[^>]*>|changeme|change_me|change-me/i;

const isProduction = (env: string | undefined): boolean => !!env && ['production', 'prod'].includes(env);

/**
 * Validate `auth.basicAuthTokens`. Returns problems (setting names only, never values).
 * Known shipped defaults are refused in every environment. Empty, placeholder, malformed or short-password
 * tokens are refused in production; elsewhere they just match nothing.
 */
export function checkAuthConfig(auth: { basicAuthTokens?: unknown } | undefined, env: string | undefined = process.env.NODE_ENV): string[] {
  const tokens = auth?.basicAuthTokens;
  const production = isProduction(env);
  const problems: string[] = [];

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return production ? ['auth.basicAuthTokens is empty: configure at least one "user:password" token.'] : [];
  }

  tokens.forEach((token, index) => {
    const name = `auth.basicAuthTokens[${index}]`;
    if (typeof token !== 'string' || token.trim() === '') {
      if (production) problems.push(`${name} is empty or not a string.`);
      return;
    }
    if (KNOWN_DEFAULT_TOKEN_HASHES.includes(createHash('sha256').update(token).digest('hex'))) {
      problems.push(`${name} is a publicly known default credential from the repository, rotate it.`);
      return;
    }
    if (!production) return;
    if (PLACEHOLDER_RE.test(token)) {
      problems.push(`${name} is a placeholder value.`);
      return;
    }
    const separator = token.indexOf(':');
    if (separator < 1) {
      problems.push(`${name} must have the form "user:password".`);
    } else if (token.length - separator - 1 < MIN_TOKEN_PASSWORD_LENGTH) {
      problems.push(`${name} password is shorter than ${MIN_TOKEN_PASSWORD_LENGTH} characters.`);
    }
  });

  return problems;
}

/** Startup guard. Throws with setting names only. */
export function assertAuthConfig(auth: { basicAuthTokens?: unknown } | undefined, env: string | undefined = process.env.NODE_ENV): void {
  const problems = checkAuthConfig(auth, env);
  if (problems.length) {
    throw new Error(`Invalid external-reader configuration: ${problems.join(' ')}`);
  }
}
