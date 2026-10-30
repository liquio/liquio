type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  slaveDb?: any;
  models?: any;
  slaveModels?: any;
  businesses?: any;
  redis?: any;
  messageQueue?: any;
  httpClient?: any;
  typeOf?: any;
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
const getSlaveDb = () => context.slaveDb;
const getModels = () => context.models;
const getSlaveModels = () => context.slaveModels;
const getBusinesses = () => context.businesses;
const getRedis = () => context.redis;
const getMessageQueue = () => context.messageQueue;
const getHttpClient = () => context.httpClient;
const getTypeOf = () => context.typeOf;

export {
  setAppContext,
  resetAppContext,
  getConfig,
  getLog,
  getDb,
  getSlaveDb,
  getModels,
  getSlaveModels,
  getBusinesses,
  getRedis,
  getMessageQueue,
  getHttpClient,
  getTypeOf,
};
