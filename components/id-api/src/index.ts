import { Application } from './application';
import { loadConfig } from './config';
import { Log } from './lib/log';

async function main() {
  const conf = loadConfig();
  const log = new Log(conf.log);

  log.save('start-application', { pid: process.pid }, 'info');

  // Log unhandled rejections.
  process.on('unhandledRejection', (error) => {
    const { stack, message } = error ?? ({} as any);
    log.save('unhandled-rejection', { stack, message }, 'error');
  });

  const application = new Application(conf);
  try {
    await application.init();
    application.listen();
  } catch (error: any) {
    log.save('start-application|error', { error: error.message, stack: error.stack }, 'error');
    process.exit(1);
  }
}

main();
