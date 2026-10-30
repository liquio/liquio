type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  redisClient?: any;
  messageQueue?: any;
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

const getConfig = () => context.config;
const getLog = () => context.log;
const getDb = () => context.db;
const getRedisClient = () => context.redisClient;
const getMessageQueue = () => context.messageQueue;

export { setAppContext, resetAppContext, getConfig, getLog, getDb, getRedisClient, getMessageQueue };
