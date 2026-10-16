// Constants.
const HOP_BY_HOP_HEADERS = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-authenticate'];

export const CONTENT_SECURITY_POLICY = "sandbox; default-src 'none'";

/**
 * Add the headers every streamed user file must carry (no MIME sniffing, sandboxed if opened).
 * @param {object} headers Headers map (mutated) or HTTP response.
 * @returns {object} The same headers map.
 */
export function applyFileSafetyHeaders(headers: Record<string, any>) {
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['Content-Security-Policy'] = CONTENT_SECURITY_POLICY;
  return headers;
}

/**
 * Same as applyFileSafetyHeaders, for an HTTP response that is not piped from an upstream.
 * @param {object} res HTTP response.
 */
export function setFileSafetyHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
}

/**
 * Pipe upstream response stream to HTTP response with upstream status code and headers.
 * @param {import('http').IncomingMessage} upstream Upstream response stream.
 * @param {object} res HTTP response.
 * @param {Function} [adjustHeaders] Hook to change (mutate) the headers before they are sent.
 * @returns {object} HTTP response.
 */
export function pipeUpstreamResponse(upstream, res, adjustHeaders?: (headers: Record<string, any>) => void) {
  const headers = { ...upstream.headers };
  HOP_BY_HOP_HEADERS.forEach((name) => delete headers[name]);
  if (adjustHeaders) {
    adjustHeaders(headers);
  }
  if (upstream.statusCode) {
    res.status(upstream.statusCode);
  }
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  // Stop the response when upstream breaks, so the client does not wait for the rest of the body forever.
  upstream.on('error', () => res.destroy());
  return upstream.pipe(res);
}
