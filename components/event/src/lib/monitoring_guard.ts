import crypto from 'node:crypto';

const HEADER_NAME = 'x-monitoring-token';
const HTTP_STATUS_FORBIDDEN = 403;

/**
 * Safe string comparison.
 * @param {string} a First string.
 * @param {string} b Second string.
 * @returns {boolean} Equal indicator.
 */
function safeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Create guard middleware for diagnostic routes (ping, monitors).
 * Routes are closed unless `server.monitoring.isEnabled` is true and the
 * request carries the `x-monitoring-token` header equal to `server.monitoring.token`.
 * @param {object} config Server config.
 * @returns {Function} Express middleware.
 */
export function monitoringGuard(config: any) {
  return (req: any, res: any, next: any) => {
    const monitoring = (config && config.server && config.server.monitoring) || {};
    const expected = monitoring.token;
    const provided = req.headers && req.headers[HEADER_NAME];

    const allowed =
      monitoring.isEnabled === true &&
      typeof expected === 'string' &&
      expected.length > 0 &&
      typeof provided === 'string' &&
      safeEqual(provided, expected);

    if (!allowed) {
      return res.status(HTTP_STATUS_FORBIDDEN).send({ error: { message: 'Forbidden.' } });
    }
    next();
  };
}
