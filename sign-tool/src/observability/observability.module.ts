import { AsyncLocalStorage } from 'async_hooks';
import * as uuid from 'uuid-random';
import { Global, MiddlewareConsumer, Module } from '@nestjs/common';

import { LoggerService } from './logger.service';

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

  constructor(
    private readonly als: AsyncLocalStorage<AsyncLocalStorageContext>,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: unknown, next: () => void) => {
        const store: AsyncLocalStorageContext = {
          traceId: req.headers['x-trace-id'] || uuid(),
        };
        this.als.run(store, () => next());
      })
      .forRoutes('*');
  }
}
