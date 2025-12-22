const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

// Init storage.
const storage = new AsyncLocalStorage();

/**
 * Async local storage for express middleware.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next request handler.
 */
module.exports.asyncLocalStorageMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || req.headers['global-trace-id'] || req.traceId || randomUUID();

  res.set('x-trace-id', traceId);

  initStorageIfNeedIt(next, traceId, req.traceMeta);
};

/**
 * Async local storage for RMQ.
 * @param {function} handler
 * @return {undefined}
 */
module.exports.runInAsyncLocalStorage = (handler) => {
  initStorageIfNeedIt(handler);
};

/**
 * Get trace ID.
 * @return {string} Trace ID.
 */
module.exports.getTraceId = () => {
  const store = storage.getStore();
  if (store) return store.get('traceId') || null;
};

/**
 * Get trace meta.
 * @return {{workflowId, taskId, documentId}} Trace meta object.
 */
module.exports.getTraceMeta = () => {
  const store = storage.getStore();
  if (store) return store.get('traceMeta') || {};
};

/**
 * Append trace meta.
 * @param {object} meta Meta object to append.
 */
module.exports.appendTraceMeta = (meta = {}) => {
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
function initStorageIfNeedIt(cb = () => undefined, traceId, traceMeta) {
  // Check if no need to init storage.
  const store = storage.getStore();
  if (store) return cb();

  // Init storage.
  storage.run(new Map(), () => {
    const store = storage.getStore();
    store.set('traceId', traceId || randomUUID());
    store.set('traceMeta', traceMeta || {});
    return cb();
  });
}
