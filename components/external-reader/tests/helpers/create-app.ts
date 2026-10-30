import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { LoggerService } from '@components/observability/logger.service';
import { ObservabilityModule } from '@components/observability/observability.module';

export { TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD } from '../setup-env';

export async function createE2eApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const logger = new LoggerService(ObservabilityModule.getAlsInstance());
  const app = moduleFixture.createNestApplication({ logger });
  configureApp(app, logger);
  await app.init();
  return app;
}

/** Sets LIQUIO_CFG_EXTERNAL_READER_<key> env vars; returns a restore function. */
export function setConfig(values: Record<string, unknown>): () => void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    const name = `LIQUIO_CFG_EXTERNAL_READER_${key}`;
    previous[name] = process.env[name];
    process.env[name] = JSON.stringify(value);
  }
  return () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}
