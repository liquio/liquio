const { AsyncLocalStorage } = require('async_hooks');
const uuid = require('uuid-random');

// Init storage.
const storage = new AsyncLocalStorage();

/**
 * Async local storage for express middleware
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {e.NextFunction} next
 * @return {undefined}
 */
module.exports.asyncLocalStorageMiddleware = (req, res, next) => {
  storage.run(new Map(), () => {
    storage.getStore().set('traceId', uuid());
    next();
  });
};

/**
 * Async local storage for RMQ
 * @param {function} handler
 * @return {undefined}
 */
module.exports.runInAsyncLocalStorage = (handler) => {
  storage.run(new Map(), () => {
    storage.getStore().set('traceId', uuid());
    handler();
  });
};

/**
 * Get trace ID
 * @return {String} traceId
 */
module.exports.getTraceId = () => {
  const store = storage.getStore();
  if (store) return store.get('traceId');
};
