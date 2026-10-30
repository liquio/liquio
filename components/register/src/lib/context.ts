type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  typeOf?: any;
  encryption?: any;
  afterhandler?: any;
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
const getTypeOf = () => context.typeOf;
const getEncryption = () => context.encryption;
const getAfterhandler = () => context.afterhandler;

export { setAppContext, resetAppContext, getConfig, getLog, getDb, getTypeOf, getEncryption, getAfterhandler };
