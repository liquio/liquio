type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  models?: any;
  moment?: any;
  typeOf?: any;
  messageBus?: any;
  redisClient?: any;
  httpClient?: any;
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
const getModels = () => context.models;
const getMoment = () => context.moment;
const getTypeOf = () => context.typeOf;
const getMessageBus = () => context.messageBus;
const getRedisClient = () => context.redisClient;
const getHttpClient = () => context.httpClient;

export { setAppContext, resetAppContext, getConfig, getLog, getDb, getModels, getMoment, getTypeOf, getMessageBus, getRedisClient, getHttpClient };
