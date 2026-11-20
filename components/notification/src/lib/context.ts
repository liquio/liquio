type AppContext = {
  conf?: any;
  env?: any;
  log?: any;
  typeOf?: any;
  extensions?: any;
  adminStaticDir?: any;
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

const getConf = () => context.conf;
const getEnv = () => context.env;
const getLog = () => context.log;
const getTypeOf = () => context.typeOf;
const getExtensions = () => context.extensions;
const getAdminStaticDir = () => context.adminStaticDir;

export { setAppContext, resetAppContext, getConf, getEnv, getLog, getTypeOf, getExtensions, getAdminStaticDir };
