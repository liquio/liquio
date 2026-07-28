import { Services, ServicesCollection } from '.';
import { Config } from '../config';
import { Log } from '../lib/log';
import { Models, ModelsCollection } from '../models';
import { Express } from '../types';

export abstract class BaseService {
  protected log = Log.get();

  constructor(
    protected config: Config,
    protected models: Models,
    protected express: Express,
  ) {}

  protected service<K extends keyof ServicesCollection>(serviceName: K): ServicesCollection[K] {
    return Services.service(serviceName);
  }

  protected model<K extends keyof ModelsCollection>(modelName: K): ModelsCollection[K]['entity'] {
    return this.models.model(modelName);
  }

  async init(): Promise<void> {
    // Do nothing by default.
  }

  async stop(): Promise<void> {
    // Do nothing by default.
  }
}
