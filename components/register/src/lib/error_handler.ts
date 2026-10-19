import { getTraceId } from '@liquio/back-core';
import type { Request, Response } from 'express';

import { publicError } from './public_error';

/**
 * Final error handler. The client gets a generic body with the trace id, whatever the Content-Type.
 * Full details go to the log only.
 */
export const errorHandler = (error: any, req: Request & { traceId?: string }, res: Response, next: Function) => {
  const traceId = req.traceId || getTraceId();
  let status = Number(error?.status ?? error?.statusCode);
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  global.log.save('error', { error: error?.message, stack: error?.stack, status, traceId }, 'error');

  if (res.headersSent) {
    return next(error);
  }
  res.status(status).send({ error: { message: publicError(error, status), code: status, traceId } });
};
