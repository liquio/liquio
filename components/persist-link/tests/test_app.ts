// Import.
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import portfinder from 'portfinder';
import supertest from 'supertest';

import AuthController from '../src/controllers/auth';
import Controllers from '../src/controllers';
import LinkController from '../src/controllers/link';
import MonitoringController from '../src/controllers/monitoring';
import TestController from '../src/controllers/test';
import Db from '../src/lib/db';
import { setAppContext } from '../src/lib/context';
import FileConverterService from '../src/lib/file_converter';
import LinkGenerator from '../src/lib/link_generator';
import LinkProviders from '../src/lib/link_providers';
import ExternalLinkProvider from '../src/lib/link_providers/external';
import FilestorageLinkProvider from '../src/lib/link_providers/filestorage';
import OpenStackLinkProvider from '../src/lib/link_providers/open_stack';
import Qr from '../src/lib/qr';
import SimpleLinkProvider from '../src/lib/link_providers/simple';
import Models from '../src/models';
import LinksModel from '../src/models/links';
import TemplateModel from '../src/models/template';
import Router from '../src/router';
import typeOf from '../src/lib/type_of';
import baseConfig from './base.config.json';

export const config: any = JSON.parse(JSON.stringify(baseConfig));

jest.setTimeout(30000);

const mockLog = {
  save: jest.fn(),
  logRouter: (_req: any, _res: any, next: () => void) => next(),
};

export class TestApp {
  private static pgContainer: StartedPostgreSqlContainer;
  private router: Router;

  constructor() {
    this.router = new Router(config);
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    return app;
  }

  static async beforeAll() {
    config.server.port = await portfinder.getPortPromise({ host: '127.0.0.1', startPort: 61000 + (process.pid % 1000) });

    this.pgContainer = await new PostgreSqlContainer('postgres:16')
      .withDatabase('persist_link')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    config.db.host = this.pgContainer.getHost();
    config.db.port = this.pgContainer.getMappedPort(5432);
    config.db.username = this.pgContainer.getUsername();
    config.db.password = this.pgContainer.getPassword();
    config.db.database = this.pgContainer.getDatabase();

    const url = `postgres://${config.db.username}:${config.db.password}@${config.db.host}:${config.db.port}`;
    execSync(`npx sequelize db:migrate --migrations-path ./migrations --url ${url}/${config.db.database}`, { env: process.env });
  }

  static async beforeEach() {
    jest.clearAllMocks();
  }

  static async afterAll() {
    await this.pgContainer?.stop();
  }

  private static resetSingletons() {
    const singletons = [
      Db,
      Models,
      LinksModel,
      TemplateModel,
      Router,
      Controllers,
      AuthController,
      TestController,
      MonitoringController,
      LinkController,
      LinkGenerator,
      LinkProviders,
      SimpleLinkProvider,
      OpenStackLinkProvider,
      FilestorageLinkProvider,
      ExternalLinkProvider,
      Qr,
      FileConverterService,
    ] as any[];

    for (const singletonClass of singletons) {
      delete singletonClass.singleton;
    }
  }

  async init() {
    TestApp.resetSingletons();
    setAppContext({ config, typeOf, log: mockLog, db: null });
    const db = await Db.getInstance(config.db);
    setAppContext({ db });

    const models = new Models(config);
    models.initModels();

    await this.router.init();
  }

  request() {
    return supertest(`http://${config.server.hostname}:${config.server.port}`);
  }

  async destroy() {
    await this.router.stop();

    const db = (Db as any).singleton;
    if (db?.close) {
      await db.close();
      delete (Db as any).singleton;
    }

    TestApp.resetSingletons();
  }
}
