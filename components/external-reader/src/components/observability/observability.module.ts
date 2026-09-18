import { AsyncLocalStorage } from 'async_hooks';

import { Global, MiddlewareConsumer, Module } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';

import { LoggerService } from '@components/observability/logger.service';

export interface AsyncLocalStorageContext {
  traceId: string;
}

const als = new AsyncLocalStorage<AsyncLocalStorageContext>();

@Global()
@Module({
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: als,
    },
    LoggerService,
  ],
  exports: [AsyncLocalStorage, LoggerService],
})
export class ObservabilityModule {
  static getAlsInstance() {
    return als;
  }

  constructor(private readonly als: AsyncLocalStorage<AsyncLocalStorageContext>) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, _res: unknown, next: () => void) => {
        const store: AsyncLocalStorageContext = {
          traceId: (req.headers['x-trace-id'] as string) || randomUUID(),
        };
        this.als.run(store, () => next());
      })
      .forRoutes('{*path}');
  }
}
