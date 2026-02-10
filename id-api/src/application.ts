import express from 'express';
import http from 'http';

import { Config } from './config';
import { Controllers, ControllersCollection } from './controllers';
import { Log, useRequestLogger } from './lib/log';
import {
  AuthMiddleware,
  useAppIdentHeaders,
  useAsyncLocalStorage,
  useBodyParser,
  useCors,
  useErrorHandler,
  usePassport,
  useProxy,
  useSession,
  useSwagger,
} from './middleware';
import { Models, ModelsCollection } from './models';
import { Services } from './services';
import { Express } from './types';

export class Application {
  protected express: Express & { config: Config };
  protected log: Log;
  protected models: Models;
  protected services: Services;
  protected controllers!: Controllers;
  protected server?: http.Server;

  constructor(private readonly config: Config) {
    this.express = express() as Express;
    this.express.config = this.config;
    this.log = Log.get();
    this.models = new Models(this.config.db);
    this.services = new Services(this.config, this.models, this.express);
  }

  controller<K extends keyof ControllersCollection>(name: K): ControllersCollection[K] {
    if (!this.controllers) {
      throw new Error('Controllers not initialized');
    }
    return this.controllers.getController(name);
  }

  model<K extends keyof ModelsCollection>(name: K): ModelsCollection[K]['entity'] {
    if (!this.models) {
      throw new Error('Models not initialized');
    }
    return this.models.model(name);
  }

  async init() {
    const express = this.express;

    try {
      await this.models.init();
    } catch (error: any) {
      this.log.save('application-server|models', { error: error.toString() }, 'error');
      throw new Error(`Models initialization error: ${error}`);
    }

    try {
      await this.services.init();
    } catch (error: any) {
      this.log.save('application-server|services', { error: error.toString() }, 'error');
      throw new Error(`Services initialization error: ${error}`);
    }

    if (this.config.gtm_key) {
      express.use((req, res, next) => {
        res.locals.gtm_key = this.config.gtm_key;
        next();
      });
    }

    useAsyncLocalStorage(express);
    useRequestLogger(express);
    useAppIdentHeaders(express);
    useSession(express);
    useSwagger(express);
    useCors(express);
    useProxy(express);
    useBodyParser(express);
    usePassport(express);

    const authMiddleware = new AuthMiddleware(express);
    await authMiddleware.init();

    this.controllers = new Controllers(this.express);

    useErrorHandler(express);
  }

  listen() {
    const host: string = this.config.host ?? '0.0.0.0';
    const port: number = Number(this.config.port ?? process.env.port ?? 80);

    this.server = this.express.listen(port, host, (error) => {
      if (error) {
        this.log.save('application-server|listen', { error: error.toString() }, 'error');
        throw new Error(`Server listen error: ${error}`);
      }

      this.log.save('application-server', { url: `http://0.0.0.0:${port}` }, 'info');
    });

    return this.server;
  }

  async stop() {
    await this.models.db.close();

    await this.services.stop();

    if (this.server) {
      await new Promise((resolve) => {
        this.server!.close(resolve);
      });
    }
    this.log.save('application-server|stopped');
  }
}
