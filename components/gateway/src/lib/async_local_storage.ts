import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

// Init storage.
const storage = new AsyncLocalStorage<Map<string, any>>();

/**
 * Async local storage for express middleware.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next request handler.
 */
export const asyncLocalStorageMiddleware = (req: any, res: any, next: any) => {
  const traceId = req.headers['x-trace-id'] || req.headers['global-trace-id'] || req.traceId;
  initStorageIfNeedIt(next, traceId, req.traceMeta);
};

/**
 * Async local storage for RMQ.
 * @param {function} handler
 * @return {undefined}
 */
export const runInAsyncLocalStorage = (handler: any) => {
  initStorageIfNeedIt(handler);
};

/**
 * Get trace ID.
 * @return {string} Trace ID.
 */
export const getTraceId = () => {
  const store = storage.getStore();
  if (store) return store.get('traceId') || null;
};

/**
 * Get trace meta.
 * @return {{workflowId, taskId, documentId}} Trace meta object.
 */
export const getTraceMeta = () => {
  const store = storage.getStore();
  if (store) return store.get('traceMeta') || {};
};

/**
 * Append trace meta.
 * @param {object} meta Meta object to append.
 */
export const appendTraceMeta = (meta: any = {}) => {
  // Check.
  const store = storage.getStore();
  if (!store) return;

  // Append.
  const traceMeta = store.get('traceMeta') || {};
  store.set('traceMeta', { ...traceMeta, ...meta });
};

/**
 * Init storage if need it.
 * @param {function} [cb] Callback function.
 * @param {string} [traceId] Trace ID.
 * @param {object} [traceMeta] Trace meta.
 */
function initStorageIfNeedIt(cb: any = () => undefined, traceId?: string, traceMeta?: any) {
  // Check if no need to init storage.
  const store = storage.getStore();
  if (store) return cb();

  // Init storage.
  storage.run(new Map(), () => {
    const store = storage.getStore();
    store!.set('traceId', traceId || randomUUID());
    store!.set('traceMeta', traceMeta || {});
    return cb();
  });
}
