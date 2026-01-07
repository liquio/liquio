import { AsyncLocalStorage } from 'async_hooks';

import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const storage = new AsyncLocalStorage<Map<string, unknown>>();

export const asyncLocalStorageMiddleware = (
  req: RequestWithTrace,
  res: Response,
  next: NextFunction,
) => {
  const traceId = req.headers['x-trace-id'] || req.traceId || randomUUID();

  res.set('x-trace-id', traceId);

  const store = storage.getStore();
  if (store) {
    return next();
  }

  storage.run(new Map(), () => {
    const store = storage.getStore();
    if (!store) {
      return next();
    }

    store.set('traceId', traceId || uuidv4());
    return next();
  });
};

export const getTraceId = () => {
  const store = storage.getStore();
  if (store) {
    return store.get('traceId');
  }
};

// Types.
type RequestWithTrace = Request & { traceId?: string };
