import path from 'node:path';

// Constants.
const ADMIN_DIRECTORY = '/admin';

/**
 * Start.
 * @param {object} config Config.
 * @param {string} adminStaticDir Admin static directory path.
 * @param {{sms: {sendSms, sendOneSms, getSMSQueue, getSMSQueueCounter, getSMSLog}}} adapters Custom adapters.
 */
const start = function (config: any, adminStaticDir: string = path.join(__dirname, ADMIN_DIRECTORY), adapters: any = {}): any {
  global.conf = config.conf;
  global.env = config.env;
  (global as any).adminStaticDir = adminStaticDir;
  (global as any).extensions = { adapters };
  // Deferred require: server.ts reads global.conf/global.env/global.adminStaticDir/global.extensions
  // at module-load time, so it must not be imported until this function has set them.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./server').server;
};

// Start dev.
if (process.argv[2] === '--start-dev') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../config/config');
  const server = start(config);
  const port = config.conf.port || process.env.port || 8080;
  server.listen(port, function () {
    console.log(`Server listening started at "http://localhost:${port}".`);
  });
}

export default start;
