import { STATUS_CODES } from 'http';

import { Express, NextFunction } from 'express';
import { Log, getTraceId } from '@liquio/back-core';

import { GENERIC_ERROR_MESSAGE, HttpError, isPublicError } from '../lib/http_error';
import { Request, Response } from '../types';

export function useErrorHandler(express: Express) {
  const log = Log.getInstance();

  // Handle unknown errors. Details go to the log only, the client gets a generic body in any Content-Type.
  function unknownError(error: Error & { status?: number }, req: Request, res: Response, _next: NextFunction): void {
    const traceId = getTraceId();
    const rawStatus = error.status;
    const status = Number.isInteger(rawStatus) && rawStatus! >= 400 && rawStatus! < 600 ? rawStatus! : 500;

    log.save('error', { error: error.toString(), stack: error.stack, status, traceId }, 'error');

    if (traceId) {
      res.set('X-Trace-Id', String(traceId));
    }

    if (error instanceof HttpError && isPublicError(error)) {
      res.status(status).send({ message: error.message });
      return;
    }

    const message = status >= 500 ? GENERIC_ERROR_MESSAGE : (STATUS_CODES[status] ?? 'Bad request');
    res.status(status).send({ error: message, ...(traceId && { traceId }) });
  }

  express.use(unknownError);
}
