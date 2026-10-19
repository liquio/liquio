/**
 * Removes the given headers (case-insensitive) from a headers object, in place.
 * Node lowercases incoming header names, so a plain `delete headers['User-Data']` would miss them.
 */
export function sanitizeProxyHeaders<T extends Record<string, any>>(headers: T | undefined | null, names: string[]): T | undefined | null {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }
  const blocked = new Set(names.map((name) => name.toLowerCase()));
  for (const key of Object.keys(headers)) {
    if (blocked.has(key.toLowerCase())) {
      delete headers[key];
    }
  }
  return headers;
}
