const DEFAULT_REDIRECT = '/';

/**
 * Same-origin relative path: starts with a single `/`, no protocol-relative `//`, no backslashes
 * (browsers treat `/\` as `//`) and no control characters or whitespace.
 */
export function isLocalPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  return !/[\\\u0000- \u007f]/.test(value);
}

/**
 * Pick a safe redirect destination: a local path or an exact (string-equal) registered redirect URI.
 * Anything else (other origins, protocol-relative URLs, prefix lookalikes, non-strings) falls back to `/`.
 */
export function resolveSafeRedirect(value: unknown, registeredRedirectUris: string[] = [], fallback: string = DEFAULT_REDIRECT): string {
  if (typeof value !== 'string' || !value) {
    return fallback;
  }

  if (isLocalPath(value)) {
    return value;
  }

  return registeredRedirectUris.includes(value) ? value : fallback;
}
