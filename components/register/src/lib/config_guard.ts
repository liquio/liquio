import { RegisterConfig } from './config';
import { parseEncryptionKey } from './encryption';
import { isPlaceholder } from './config.schema';
import { getLog } from './context';

/**
 * Validate the encryption key. A known placeholder is always a problem (nobody may run with it).
 * An empty or malformed key is a problem only when encrypted data may exist
 * (`encryptedKeysExist`) or `encryption.check_on_startup` is on; otherwise the register just can't store encrypted keys.
 * Never generates or replaces a key.
 */
export function checkEncryptionConfig(config: Pick<RegisterConfig, 'encryption'>, encryptedKeysExist: boolean): string[] {
  const key = config?.encryption?.key;
  const checkOnStartup = !!config?.encryption?.check_on_startup;

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

/** Startup guard for the encryption key; call once the DB is reachable. */
export function assertEncryptionConfig(config: RegisterConfig, encryptedKeysExist: boolean): void {
  fail(checkEncryptionConfig(config, encryptedKeysExist));
}

/**
 * Warn about a plain `http://` sign-tool URL in production unless `sign.allowPlainHttp` is set.
 * Does not refuse to start: shipped Helm values still use http for the in-cluster call (protected by NetworkPolicies).
 * @returns {boolean} true when a warning was logged.
 */
export function warnPlainHttpSign(config: RegisterConfig, env: string | undefined = process.env.NODE_ENV): boolean {
  const sign = config?.sign;
  if (!env || !['production', 'prod'].includes(env) || sign?.allowPlainHttp === true) return false;
  if (typeof sign?.url !== 'string' || !/^http:\/\//i.test(sign.url.trim())) return false;
  getLog()?.save(
    'sign-plain-http',
    { key: 'sign.url', hint: 'Use https:// with sign.tls.ca, or set sign.allowPlainHttp=true when NetworkPolicy/mesh mTLS protects the traffic.' },
    'warn',
  );
  return true;
}

/**
 * Warn about an empty or placeholder `sign.token` in production unless `sign.allowEmptyToken` is set.
 * Warning only: sign-tool does not check the `token` header at all (no auth in components/sign-tool),
 * and the shipped config/Helm values use an empty token, so a refusal would break every install.
 * @returns {boolean} true when a warning was logged.
 */
export function warnEmptySignToken(config: RegisterConfig, env: string | undefined = process.env.NODE_ENV): boolean {
  const sign = config?.sign;
  if (!env || !['production', 'prod'].includes(env) || sign?.allowEmptyToken === true) return false;
  const token = sign?.token;
  const unusable = typeof token !== 'string' || token.trim() === '' || isPlaceholder(token);
  if (!unusable) return false;
  getLog()?.save(
    'sign-empty-token',
    {
      key: 'sign.token',
      hint: 'sign-tool does not verify this token today. Set sign.token if the sign service requires one, or sign.allowEmptyToken=true to silence this warning.',
    },
    'warn',
  );
  return true;
}
