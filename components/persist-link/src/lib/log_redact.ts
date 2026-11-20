// Component-local log redaction helpers (persist-link).

// Constants.
const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_REGEXP = /token|password|passwd|secret|authorization|cookie|api[-_]?key|^headers$/i;
const MAX_DEPTH = 6;

/**
 * Redact sensitive values (tokens, passwords, headers) deeply.
 * Returns a plain copy and never mutates the input.
 * @param {*} value Value to redact.
 * @param {number} [depth] Current depth.
 * @returns {*} Redacted copy.
 */
export function redact(value, depth = 0) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (depth >= MAX_DEPTH) {
    return '[Truncated]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_REGEXP.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return result;
}

/**
 * Describe link data/options without exposing values (they may hold tokens or register data).
 * @param {*} options Decrypted link options.
 * @returns {{keys: string[]}|undefined} Keys only.
 */
export function describeOptions(options) {
  if (options === null || typeof options !== 'object') {
    return undefined;
  }
  return { keys: Object.keys(options) };
}

const PUBLIC_PATH_SEGMENTS = ['test', 'monitoring', 'templates', 'link'];

/**
 * Redact the persist link hash from a request URL (routes: /:hash, /:hash/template, /link/:hash).
 * @param {string} url Request URL.
 * @returns {string} URL with hash replaced.
 */
export function redactUrl(url) {
  if (typeof url !== 'string') {
    return url;
  }
  const [path, ...query] = url.split('?');
  const segments = path.split('/');
  const hashIndex = segments[1] === 'link' ? 2 : 1;
  if (segments[hashIndex] && (hashIndex === 2 || !PUBLIC_PATH_SEGMENTS.includes(segments[1]))) {
    segments[hashIndex] = ':hash';
  }
  return [segments.join('/'), ...query].join('?');
}
