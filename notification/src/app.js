const path = require('path');

// Constants.
const ADMIN_DIRECTORY = '/admin';

/**
 * Start.
 * @param {object} config Config.
 * @param {string} adminStaticDir Admin static directory path.
 * @param {{sms: {sendSms, sendOneSms, getSMSQueue, getSMSQueueCounter, getSMSLog}}} adapters Custom adapters.
 */
let start = function (config, adminStaticDir = path.join(__dirname, ADMIN_DIRECTORY), adapters = {}) {
  global.conf = config.conf;
  global.env = config.env;
  global.adminStaticDir = adminStaticDir;
  global.extensions = { adapters };
  return require('./server');
};

// Start dev.
if (process.argv[2] === '--start-dev') {
  const config = require('../config/config');
  const server = start(config);
  server.listen(config.conf.port || process.env.port || 8080, function () {
    console.log(`Server listening started at "${server.url}".`);
  });
}

module.exports = start;
