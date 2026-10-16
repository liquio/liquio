// Path filter for the catch-all proxy (`discovery.mainProxy`). cabinet-api is internet-facing, task is not:
// service-to-service and debug routes of task must never be reachable through the proxy.

export interface MainProxyFilterConfig {
  mainProxyDenyPaths?: string[]; // Extra prefixes to deny, added to the built-in list.
  mainProxyAllowPaths?: string[]; // Optional allow-list; when non-empty, everything else is denied.
}

// Denied by default. Prefixes match on a path-segment boundary (`/test` matches `/test/x`, not `/testing`).
// `/test/ping` is served by cabinet-api itself before the proxy. `/external_reader` itself is used by the cabinet
// front (data reads, cache reset, captcha widgets), so only its debug sub-path is denied.
export const DEFAULT_MAIN_PROXY_DENY_PATHS = [
  '/external_services',
  '/external-services',
  '/test',
  '/auth/bearer',
  '/external_reader/mocks-keys-by-user',
];

const MAX_DECODE_ROUNDS = 3;
const ENCODED_SEPARATOR = /%2f|%5c|%00/i;

/**
 * Normalise a request path for matching.
 * @param reqPath Request path (query string is stripped if present).
 * @returns Lower-cased path without `//` and trailing slash, or null if the path is malformed or suspicious
 * (encoded slash/backslash, null byte, `.`/`..` segment, bad escape, deeply nested encoding).
 */
export function normalizeProxyPath(reqPath: string): string | null {
  if (typeof reqPath !== 'string') {
    return null;
  }
  let current = reqPath.split(/[?#]/, 1)[0];
  for (let round = 0; ; round++) {
    if (ENCODED_SEPARATOR.test(current) || /[\\\0]/.test(current)) {
      return null;
    }
    if (!current.includes('%')) {
      break;
    }
    if (round >= MAX_DECODE_ROUNDS) {
      return null;
    }
    try {
      current = decodeURIComponent(current);
    } catch {
      return null;
    }
  }
  const segments = current.toLowerCase().split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  const normalized = '/' + segments.filter(Boolean).join('/');
  return normalized;
}

function matchesPrefix(path: string, prefix: string): boolean {
  const pathSegments = path.split('/').filter(Boolean);
  const prefixSegments = prefix.toLowerCase().split('/').filter(Boolean);
  return (
    prefixSegments.length <= pathSegments.length &&
    prefixSegments.every((segment, i) => (segment.startsWith(':') && segment.length > 1 ? true : segment === pathSegments[i]))
  );
}

/**
 * Decide whether a request may be forwarded to the main proxy.
 * @param _method HTTP method (reserved, rules are path-based).
 * @param reqPath Request path.
 * @param cfg Discovery config.
 * @returns True if the request may be proxied.
 */
export function isMainProxyPathAllowed(_method: string, reqPath: string, cfg: MainProxyFilterConfig = {}): boolean {
  const path = normalizeProxyPath(reqPath);
  if (path === null) {
    return false;
  }
  const denyPaths = [...DEFAULT_MAIN_PROXY_DENY_PATHS, ...(cfg.mainProxyDenyPaths ?? [])];
  if (denyPaths.some((prefix) => matchesPrefix(path, prefix))) {
    return false;
  }
  const allowPaths = cfg.mainProxyAllowPaths;
  if (Array.isArray(allowPaths) && allowPaths.length > 0) {
    return allowPaths.some((prefix) => matchesPrefix(path, prefix));
  }
  return true;
}
