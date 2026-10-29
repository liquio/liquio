import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { log, nestLogger } from './lib/log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger, bodyParser: false });

  const serverConfig = configureApp(app);

  await app.listen(serverConfig.port, () => {
    log.save('server-listening-started', { port: serverConfig.port });
  });
}

bootstrap().catch((error) => {
  log.save('unhandled-error', { error });
  process.exit(1);
});
