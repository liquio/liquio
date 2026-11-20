// Encoded separators / null bytes and dot segments should never occur in a legitimate request.
// An intermediary (ingress, upstream router) could decode them differently than we match here,
// turning one approved path into a different one, so such requests are rejected before matching.
const SUSPICIOUS_PATH_PATTERN = /%2f|%5c|%00|\\|(^|\/)(\.|%2e){2}(\/|$)/i;

/**
 * Check whether a request path contains an encoded separator, null byte or `..` segment.
 * @param reqPath Request path (no query string).
 * @returns True if the path is suspicious and must be rejected.
 */
export function isSuspiciousPath(reqPath: string): boolean {
  return SUSPICIOUS_PATH_PATTERN.test(reqPath);
}

/**
 * Compile an allowedPaths `path` entry into a matcher.
 * Plain paths are matched exactly. A `:param` segment matches exactly one non-empty path segment.
 * Matching is case- and trailing-slash-sensitive.
 * @param path Configured path, e.g. "/acquirer/:acquirer_id".
 * @returns Matcher for a request path.
 */
export function compilePathMatcher(path: string): (reqPath: string) => boolean {
  if (!path.includes(':')) {
    return (reqPath) => reqPath === path;
  }
  const expected = path.split('/');
  return (reqPath) => {
    const actual = reqPath.split('/');
    return (
      actual.length === expected.length &&
      expected.every((segment, i) => (segment.startsWith(':') && segment.length > 1 ? actual[i] !== '' : segment === actual[i]))
    );
  };
}
