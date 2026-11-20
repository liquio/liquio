import type { MessageBus } from '@liquio/back-core';

type AppContext = {
  config?: any;
  log?: any;
  db?: any;
  redisClient?: any;
  messageBus?: MessageBus;
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
const getMessageBus = () => context.messageBus as MessageBus;

export { setAppContext, resetAppContext, getConfig, getLog, getDb, getRedisClient, getMessageBus };
