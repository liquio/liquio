module.exports = async () => {
  const Multiconf = require('multiconf');
  const Db = require('./lib/db');
  const Log = require('./lib/log');
  const MessageQueue = require('./lib/message_queue');

  const CONFIG_PATH = './config';

  const config = Multiconf.get(CONFIG_PATH);
  global.config = config;

  const log = new Log([], []);
  global.log = log;

  const db = await Db.getInstance(config.db);
  global.db = db;

  const messageQueue = new MessageQueue(config.message_queue);
  await messageQueue.init();
  global.messageQueue = messageQueue;
};
