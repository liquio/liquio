const Multiconf = require('multiconf');
const App = require('./app');

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/event';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_EVENT';

async function main() {
  const config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);

  const app = new App(config);
  app.useGlobalErrors();
  app.useGlobalTypeOf();
  app.useLog();
  app.useHttpClient();
  app.useUnhandedRejectionLogging();
  app.useMoment();
  app.useRedis();
  await app.useDb();
  app.useModels();
  app.useEventService();
  app.useEventBusiness();
  await app.useMessageQueue();
  await app.useRouter();
  app.useLogsBroadcasting();
}

main();
