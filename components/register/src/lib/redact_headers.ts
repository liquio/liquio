const REDACTED = '***';
const SENSITIVE_HEADER = /token|authori[sz]ation|cookie|api[-_]?key|secret|password|signature/i;

/**
 * Copy of request headers safe to log: values of token-like headers
 * (token, Authorization, Cookie, x-api-key, ...) are replaced with a mask.
 * @param {object} [headers] Request headers.
 * @returns {object|undefined} Redacted copy. Non-object input is returned as is.
 */
export function redactHeaders<T>(headers: T): T {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return headers;
  const source: any = typeof (headers as any).toJSON === 'function' ? (headers as any).toJSON() : headers;
  return Object.fromEntries(Object.entries(source).map(([name, value]) => [name, SENSITIVE_HEADER.test(name) ? REDACTED : value])) as T;
}

/**
 * Copy of request options safe to log: `headers` redacted, `httpsAgent` dropped.
 * @param {object} requestOptions Request options.
 * @returns {object} Safe copy.
 */
export function redactRequestOptions<T extends { headers?: any }>(requestOptions: T): T {
  return { ...requestOptions, headers: redactHeaders(requestOptions?.headers), httpsAgent: undefined };
}
