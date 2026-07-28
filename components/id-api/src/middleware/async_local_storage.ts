import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

import { Express, NextFunction, Request, Response } from '../types';

type StoreKeys = 'traceId' | 'traceMeta';

class Store extends Map<StoreKeys, any> {
  get(key: StoreKeys) {
    return super.get(key);
  }

  set(key: StoreKeys, value: any) {
    return super.set(key, value);
  }
}

// Init storage.
const storage = new AsyncLocalStorage<Store>();

export function useAsyncLocalStorage(express: Express) {
  express.use(asyncLocalStorageMiddleware as any);
}

/**
 * Async local storage for express middleware.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next request handler.
 */
export function asyncLocalStorageMiddleware(req: Request, res: Response, next: NextFunction) {
  let traceId = req.headers['x-trace-id'] || req.headers['global-trace-id'] || req.traceId || randomUUID();

  if (Array.isArray(traceId)) traceId = traceId[0];

  res.set('x-trace-id', traceId);

  initStorageIfNeedIt(next, traceId, req.traceMeta);
}

/**
 * Async local storage for RMQ.
 * @param {function} handler
 * @return {undefined}
 */
export function runInAsyncLocalStorage(handler: NextFunction) {
  initStorageIfNeedIt(handler);
}

/**
 * Get trace ID.
 * @return {string} Trace ID.
 */
export function getTraceId() {
  const store = storage.getStore();
  if (store) return store.get('traceId') ?? null;
}

/**
 * Get trace meta.
 * @return {{workflowId, taskId, documentId}} Trace meta object.
 */
export function getTraceMeta() {
  const store = storage.getStore();
  if (store) return store.get('traceMeta') ?? {};
}

/**
 * Append trace meta.
 * @param {object} meta Meta object to append.
 */
export function appendTraceMeta(meta = {}) {
  // Check.
  const store = storage.getStore();
  if (!store) return;

  // Append.
  const traceMeta = store.get('traceMeta') ?? {};
  store.set('traceMeta', { ...traceMeta, ...meta });
}

/**
 * Init storage if need it.
 * @param {function} [cb] Callback function.
 * @param {string} [traceId] Trace ID.
 * @param {object} [traceMeta] Trace meta.
 */
function initStorageIfNeedIt(cb: NextFunction = () => undefined, traceId?: string, traceMeta?: Record<string, any>) {
  // Check if no need to init storage.
  const store = storage.getStore();
  if (store) return cb();

  // Init storage.
  storage.run(new Store(), () => {
    const store = storage.getStore();
    if (store) {
      store.set('traceId', traceId ?? randomUUID());
      store.set('traceMeta', traceMeta || {});
    }
    return cb();
  });
}
