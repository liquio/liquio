import { getTraceId } from '@liquio/back-core';

import { getErrorStatus, publicError } from '../../lib/public_error';
import { getLog } from '../../lib/context';

/**
 * Global Express error handler.
 * Client gets only a safe message: a public (intentional) error keeps its text, a 5xx gets a generic text,
 * any other 4xx gets only the HTTP status text. The full error and stack go to the log only.
 */
export function errorHandler(error: any, _req: any, res: any, _next: any): void {
  const status = getErrorStatus(error) || 500;
  const traceId = getTraceId();
  const message = publicError(error, status, typeof error?.message === 'string' ? error.message : undefined);

  getLog().save('http-response|unhandled-error', { message: error?.message, code: error?.code, status, stack: error?.stack, traceId }, 'error');

  if (traceId) {
    res.set?.('X-Trace-Id', traceId);
  }
  res.status(status).send({ error: { message, code: status }, traceId });
}
