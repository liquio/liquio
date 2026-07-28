import { Express, NextFunction } from 'express';

import { HttpError } from '../lib/http_error';
import { Log } from '../lib/log';
import { Request, Response } from '../types';

export function useErrorHandler(express: Express) {
  const log = Log.get();

  // Handle unknown errors.
  function unknownError(error: Error & { status?: number }, req: Request, res: Response, _next: NextFunction): void {
    if (error instanceof HttpError) {
      res.status(error.status).send({
        message: error.toString(),
      });
      return;
    }

    const isJson = req.get('Content-Type')?.toLowerCase() === 'application/json';
    const status = error.status ?? 500;
    const body = isJson ? { error: error.toString() } : 'Internal server error';

    log.save('error', { error: error.toString(), stack: error.stack, status }, 'error');

    res.status(status).send(body);
  }

  express.use(unknownError);
}
