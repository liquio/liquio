import { Application } from './application';
import { loadConfig } from './config';
import { Log, ConsoleLogProvider } from '@liquio/back-core';

async function main() {
  const conf = loadConfig();
  const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: conf.log?.excludeParams });
  const log = new Log([consoleLogProvider], ['console']);

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
