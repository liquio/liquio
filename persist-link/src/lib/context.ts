type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  typeOf?: any;
};

const context: AppContext = {};

const setAppContext = (nextContext: AppContext = {}) => {
  Object.assign(context, nextContext);
};

const getConfig = () => context.config;
const getLog = () => context.log;
const getDb = () => context.db;
const getTypeOf = () => context.typeOf;

export { setAppContext, getConfig, getLog, getDb, getTypeOf };
