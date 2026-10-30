type AppContext = {
  log?: any;
  db?: any;
  silentUpload?: boolean;
  metrics?: any;
};

const context: AppContext = {};

const setAppContext = (nextContext: AppContext = {}) => {
  Object.assign(context, nextContext);
};

const resetAppContext = () => {
  for (const key of Object.keys(context)) {
    delete context[key as keyof AppContext];
  }
};

const getLog = () => context.log;
const getDb = () => context.db;
const getSilentUpload = () => context.silentUpload;
const getMetrics = () => context.metrics;

export { setAppContext, resetAppContext, getLog, getDb, getSilentUpload, getMetrics };
