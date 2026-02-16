import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// Type for trace metadata
interface TraceMeta {
  workflowId?: string;
  taskId?: string;
  documentId?: string;
  [key: string]: any;
}

// Init storage.
const storage = new AsyncLocalStorage<Map<string, any>>();

/**
 * Get trace ID from async local storage
 * @returns Trace ID string
 */
const getTraceId = (): string | undefined => {
  const store = storage.getStore();
  if (store) return store.get('traceId');
};

/**
 * Get trace metadata from async local storage
 * @returns Trace metadata object
 */
const getTraceMeta = (): TraceMeta | undefined => {
  const store = storage.getStore();
  if (store) return store.get('traceMeta');
};

/**
 * Append trace metadata to existing trace meta
 * @param meta - Metadata to append
 */
const appendTraceMeta = (meta: TraceMeta = {}): void => {
  const store = storage.getStore();
  if (!store) return;

  const traceMeta = store.get('traceMeta') || {};
  store.set('traceMeta', { ...traceMeta, ...meta });
};

/**
 * Initialize storage if not already initialized
 * @param cb - Callback function to run in the storage context
 * @param traceId - Optional trace ID
 * @param traceMeta - Optional trace metadata
 */
const initStorageIfNeedIt = (cb: () => any = () => undefined, traceId?: string, traceMeta?: TraceMeta): any => {
  const store = storage.getStore();
  if (store) return cb();

  return storage.run(new Map(), () => {
    const newStore = storage.getStore();
    if (newStore) {
      newStore.set('traceId', traceId || randomUUID());
      newStore.set('traceMeta', traceMeta || {});
    }
    return cb();
  });
};

/**
 * Middleware for async local storage in Express
 * @param req - HTTP request
 * @param res - HTTP response
 * @param next - Next middleware function
 */
const asyncLocalStorageMiddleware = (req: any, res: any, next: () => void): void => {
  const traceId = req.headers['x-trace-id'] || req.headers['global-trace-id'] || req.traceId || randomUUID();

  res.set('x-trace-id', traceId);

  initStorageIfNeedIt(next, traceId, req.traceMeta);
};

/**
 * Run callback in async local storage context
 * @param handler - Handler function to run
 */
const runInAsyncLocalStorage = (handler: () => any): any => {
  return initStorageIfNeedIt(handler);
};

export { getTraceId, getTraceMeta, appendTraceMeta, asyncLocalStorageMiddleware, runInAsyncLocalStorage };
