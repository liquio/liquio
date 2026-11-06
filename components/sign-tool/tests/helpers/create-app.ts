import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { LoggerService } from '../../src/observability/logger.service';
import { ObservabilityModule } from '../../src/observability/observability.module';
import type { HttpsOptions } from '../../src/common/tls';

export async function createE2eApp(opts: { httpsOptions?: HttpsOptions } = {}): Promise<INestApplication> {
  const { httpsOptions } = opts;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const logger = new LoggerService(ObservabilityModule.getAlsInstance());
  const app = moduleRef.createNestApplication({ logger, ...(httpsOptions ? { httpsOptions } : {}) });
  configureApp(app, logger, { requireClientCert: !!httpsOptions?.ca });
  await app.init();
  return app;
}

export interface LogLine {
  type: string;
  data: any;
  level: string;
  appInfo?: { name: string; version: string };
  [key: string]: any;
}

/** Captures JSON log lines written to stdout/stderr by LoggerService. */
export function captureLogs() {
  const lines: LogLine[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const wrap =
    (orig: typeof process.stdout.write) =>
    (chunk: any, ...rest: any[]) => {
      for (const part of String(chunk).split('\n')) {
        if (!part.startsWith('{')) continue;
        try {
          lines.push(JSON.parse(part));
        } catch {
          // not a log line
        }
      }
      return (orig as any)(chunk, ...rest);
    };
  process.stdout.write = wrap(out) as any;
  process.stderr.write = wrap(err) as any;
  return {
    lines,
    stop() {
      process.stdout.write = out;
      process.stderr.write = err;
    },
  };
}

/** Sets env overrides (LIQUIO_CFG_SIGN_TOOL_<key>) and returns a restore function. */
export function setEnv(values: Record<string, string>): () => void {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(values)) {
    prev[k] = process.env[k];
    process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

/** Pins Date only (fixture certificates expired on 2026-07-21). */
export function pinClock() {
  jest.useFakeTimers({
    now: new Date('2026-01-01T00:00:00Z'),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });
}
