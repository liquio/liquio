export const REDACTED = '[REDACTED]';

const SENSITIVE_HEADERS = new Set(['token', 'authorization', 'cookie', 'set-cookie', 'x-api-key', 'user-data', 'allow-tokens']);
const SENSITIVE_QUERY_PARAMS = new Set(['token', 'access_token', 'refresh_token', 'code', 'key', 'secret']);

/**
 * Returns a copy of headers with sensitive values replaced. The original object is not mutated.
 */
export function redactHeaders<T extends Record<string, any>>(headers: T | undefined | null): Record<string, any> | undefined | null {
  if (!headers || typeof headers !== 'object') {
    return headers as any;
  }
  const result: Record<string, any> = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? REDACTED : value;
  }
  return result;
}

/**
 * Masks values of sensitive query parameters in URL (string-based, keeps the rest of the URL as is).
 */
export function redactUrl(url: string | undefined | null): string | undefined | null {
  if (typeof url !== 'string') {
    return url;
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }
  const hashIndex = url.indexOf('#', queryIndex);
  const query = url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex);
  const tail = hashIndex === -1 ? '' : url.slice(hashIndex);
  const redactedQuery = query
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      const rawName = eq === -1 ? pair : pair.slice(0, eq);
      let name = rawName;
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, ' '));
      } catch {
        // Keep raw name.
      }
      return SENSITIVE_QUERY_PARAMS.has(name.toLowerCase()) ? `${rawName}=${REDACTED}` : pair;
    })
    .join('&');
  return `${url.slice(0, queryIndex)}?${redactedQuery}${tail}`;
}

/**
 * Returns URL path without query string and fragment.
 */
export function urlPath(url: string | undefined | null): string | undefined | null {
  if (typeof url !== 'string') {
    return url;
  }
  return url.split(/[?#]/)[0];
}

/**
 * Returns only safe fields of an error for logging.
 * Axios/got errors carry request config, headers and response objects with tokens, so they are never logged as is.
 */
export function safeError(err: any): Record<string, any> {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }
  const result: Record<string, any> = { name: err.name, message: err.message };
  const status = err.status ?? err.statusCode ?? err.response?.status ?? err.response?.statusCode;
  if (status !== undefined) {
    result.status = status;
  }
  if (err.code !== undefined) {
    result.code = err.code;
  }
  result.stack = err.stack;
  return result;
}
