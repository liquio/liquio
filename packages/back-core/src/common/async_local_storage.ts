import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

// Init storage.
const storage = new AsyncLocalStorage();

/**
 * Minimal structural shapes for the pieces of Express' Request/Response/NextFunction
 * actually used here. Consumers pin different major versions of @types/express, so
 * this avoids coupling back-core's public API to any one of them.
 */
interface RequestWithTrace {
  headers: Record<string, string | string[] | undefined>;
  traceId?: string;
  traceMeta?: Record<string, any>;
}

interface ResponseLike {
  set(field: string, value: string | string[]): unknown;
}

type NextFunction = (...args: any[]) => void;

/**
 * Async local storage for express middleware.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next request handler.
 */
export function asyncLocalStorageMiddleware(req: RequestWithTrace, res: ResponseLike, next: NextFunction): void {
  let traceId: string | string[] = req.headers['x-trace-id'] || req.headers['global-trace-id'] || req.traceId || randomUUID();
  if (Array.isArray(traceId)) traceId = traceId[0];

  res.set('x-trace-id', traceId);

  initStorageIfNeedIt(next, traceId, req.traceMeta);
}

/**
 * Async local storage for RMQ.
 * @param {function} handler
 * @return {undefined}
 */
export function runInAsyncLocalStorage(handler: (...args: any[]) => void): void {
  initStorageIfNeedIt(handler);
}

/**
 * Get trace ID.
 * @return {string} Trace ID.
 */
export function getTraceId(): string | undefined {
  const store = storage.getStore() as Map<string, any>;
  if (store) return store.get('traceId');
}

/**
 * Get trace meta.
 * @return {{workflowId, taskId, documentId}} Trace meta object.
 */
export function getTraceMeta(): Record<string, any> | undefined {
  const store = storage.getStore() as Map<string, any>;
  if (store) return store.get('traceMeta') || {};
}

/**
 * Append trace meta.
 * @param {object} meta Meta object to append.
 */
export function appendTraceMeta(meta = {}): void {
  // Check.
  const store = storage.getStore() as Map<string, any>;
  if (!store) return;

  // Append.
  const traceMeta = store.get('traceMeta') || {};
  store.set('traceMeta', { ...traceMeta, ...meta });
}

/**
 * Init storage if need it.
 * @param {function} [cb] Callback function.
 * @param {string} [traceId] Trace ID.
 * @param {object} [traceMeta] Trace meta.
 */
function initStorageIfNeedIt(cb: (...args: any[]) => void = () => undefined, traceId?: string, traceMeta?: object): void {
  // Check if no need to init storage.
  const store = storage.getStore();
  if (store) return cb();

  // Init storage.
  storage.run(new Map(), () => {
    const store = storage.getStore() as Map<string, any>;
    store.set('traceId', traceId || randomUUID());
    store.set('traceMeta', traceMeta || {});
    return cb();
  });
}
