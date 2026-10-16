import { Config } from './config';
import { parseEncryptionKey } from './encryption';
import { checkServicePermissionsConfig } from './service_permissions';

/** Minimum length of the password part of a Basic auth token. */
export const MIN_TOKEN_PASSWORD_LENGTH = 8;

const PLACEHOLDER_RE = /<?\bREDACTED\b>?|<[^>]*>|changeme|change_me|change-me/i;

const isPlaceholder = (value: string): boolean => PLACEHOLDER_RE.test(value);

/**
 * Validate the auth config. Returns problems (setting names only, never values).
 */
export function checkAuthConfig(config: Pick<Config, 'auth'>): string[] {
  const tokens = config?.auth?.tokens;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return ['auth.tokens is empty: at least one Basic auth token must be configured.'];
  }

  const problems: string[] = [];
  tokens.forEach((token, index) => {
    const name = `auth.tokens[${index}]`;
    if (typeof token !== 'string' || token.trim() === '') {
      problems.push(`${name} is empty or not a string.`);
      return;
    }
    if (isPlaceholder(token)) {
      problems.push(`${name} is a placeholder value.`);
      return;
    }
    const match = /^Basic\s+(\S+)$/i.exec(token.trim());
    if (!match) return; // Non-Basic tokens are not inspected.
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const password = separator === -1 ? '' : decoded.slice(separator + 1);
    if (isPlaceholder(decoded)) {
      problems.push(`${name} decodes to a placeholder value.`);
    } else if (password.length < MIN_TOKEN_PASSWORD_LENGTH) {
      problems.push(`${name} password is shorter than ${MIN_TOKEN_PASSWORD_LENGTH} characters.`);
    }
  });
  return problems;
}

/**
 * Validate the encryption key. A known placeholder is always a problem (nobody may run with it).
 * An empty or malformed key is a problem only when encrypted data may exist
 * (`encryptedKeysExist`) or `encryption.check_on_startup` is on; otherwise the register just can't store encrypted keys.
 * Never generates or replaces a key.
 */
export function checkEncryptionConfig(config: Pick<Config, 'encryption'>, encryptedKeysExist: boolean): string[] {
  const key = config?.encryption?.key;
  const checkOnStartup = !!(config?.encryption as { check_on_startup?: boolean } | undefined)?.check_on_startup;

  if (typeof key === 'string' && key !== '' && isPlaceholder(key)) {
    return ['encryption.key is a placeholder value.'];
  }
  if (!encryptedKeysExist && !checkOnStartup) return [];

  const reason = encryptedKeysExist ? 'encrypted register keys exist' : 'encryption.check_on_startup is enabled';
  if (typeof key !== 'string' || key === '') {
    return [`encryption.key is empty but ${reason}.`];
  }
  try {
    parseEncryptionKey(key);
  } catch {
    return [`encryption.key must be 64 hex characters or base64 of 32 bytes (AES-256), but ${reason}.`];
  }
  return [];
}

function fail(problems: string[]): void {
  if (problems.length) {
    throw new Error(`Invalid register configuration: ${problems.join(' ')}`);
  }
}

/** Startup guard for settings that do not need the DB. Throws with setting names only. */
export function assertSafeConfig(config: Config): void {
  const encryption = checkEncryptionConfig(config, false).filter((p) => p.includes('placeholder'));
  fail([...checkAuthConfig(config), ...checkServicePermissionsConfig(config?.auth), ...encryption]);
}

/** Startup guard for the encryption key; call once the DB is reachable. */
export function assertEncryptionConfig(config: Config, encryptedKeysExist: boolean): void {
  fail(checkEncryptionConfig(config, encryptedKeysExist));
}

/**
 * Warn about a plain `http://` sign-tool URL in production unless `sign.allowPlainHttp` is set.
 * Does not refuse to start: shipped Helm values still use http for the in-cluster call (protected by NetworkPolicies).
 * @returns {boolean} true when a warning was logged.
 */
export function warnPlainHttpSign(config: Config, env: string | undefined = process.env.NODE_ENV): boolean {
  const sign = config?.sign;
  if (!env || !['production', 'prod'].includes(env) || sign?.allowPlainHttp === true) return false;
  if (typeof sign?.url !== 'string' || !/^http:\/\//i.test(sign.url.trim())) return false;
  global.log?.save(
    'sign-plain-http',
    { key: 'sign.url', hint: 'Use https:// with sign.tls.ca, or set sign.allowPlainHttp=true when NetworkPolicy/mesh mTLS protects the traffic.' },
    'warn',
  );
  return true;
}
