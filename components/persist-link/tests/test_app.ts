// Import.
import { execSync } from 'node:child_process';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import supertest from 'supertest';

import { bootstrap } from '../src/bootstrap';
import AuthController from '../src/controllers/auth';
import Controllers from '../src/controllers';
import LinkController from '../src/controllers/link';
import TestController from '../src/controllers/test';
import Db from '../src/lib/db';
import { setAppContext } from '../src/lib/context';
import FileConverterService from '../src/lib/file_converter';
import LinkGenerator from '../src/lib/link_generator';
import LinkProviders from '../src/lib/link_providers';
import ExternalLinkProvider from '../src/lib/link_providers/external';
import FilestorageHandler from '../src/lib/link_providers/filestorage/filestorage_handler';
import FileStorageConnection from '../src/lib/link_providers/filestorage/filestorage_handler/filestorage_connection';
import OpenStackHandler from '../src/lib/link_providers/open_stack/open_stack_handler';
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

// Covers beforeAll hooks that boot testcontainers (slow on loaded CI runners), not just test bodies.
jest.setTimeout(120000);

const mockLog = {
  save: jest.fn(),
  logRouter: (_req: any, _res: any, next: () => void) => next(),
};

export class TestApp {
  private static pgContainer: StartedPostgreSqlContainer;
  private router?: Router;
  private port = 0;

  static async setup() {
    const app = new TestApp();
    await app.init();
    return app;
  }

  static async beforeAll() {
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
      LinkController,
      LinkGenerator,
      LinkProviders,
      SimpleLinkProvider,
      OpenStackLinkProvider,
      FilestorageLinkProvider,
      FilestorageHandler,
      OpenStackHandler,
      FileStorageConnection,
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
    // Port 0: the OS assigns a free port atomically at listen time.
    config.server.hostname = '127.0.0.1';
    config.server.port = 0;
    this.router = await bootstrap(config, { sandboxIsolationLevel: config.sandbox?.isolationLevel });

    const address = (this.router as any).server?.address();
    if (!address || typeof address === 'string') {
      throw new Error('HTTP server is not listening.');
    }
    this.port = address.port;
    config.server.port = address.port;
  }

  request() {
    return supertest(`http://127.0.0.1:${this.port}`);
  }

  async destroy() {
    await this.router?.stop();

    const db = (Db as any).singleton;
    if (db?.close) {
      await db.close();
      delete (Db as any).singleton;
    }

    TestApp.resetSingletons();
  }
}
