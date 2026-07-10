// @ts-nocheck
import supertest from 'supertest';
import * as portfinder from 'portfinder';
import nock from 'nock';
import { execSync } from 'child_process';
import createDebug from 'debug';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as Multiconf from 'multiconf';

import Db from '../src/lib/db';
import Log from '../src/lib/log';
import ConsoleLogProvider from '../src/lib/log/providers/console';
import RouterService from '../src/services/router';

const debug = createDebug;

// E2E tests are slow, so we increase the timeout.
jest.setTimeout(30000);

// Mock the log module, so tests don't spam the console and can inspect saved entries.
jest.mock('../src/lib/log', () => {
  const OriginalLog = jest.requireActual('../src/lib/log');
  const logs = [];
  class MockLog extends OriginalLog {
    save(...args) {
      debug('test:log')(...args);
      logs.push(args);
      return Promise.resolve();
    }

    getLogs() {
      return logs;
    }
  }

  return MockLog;
});

// Mock the configuration module.
const configOverride: any = {};
const CONFIG_PATH = process.env.CONFIG_PATH || '../config-templates/manager';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_MANAGER';

// Obtain the default configuration object.
const defaultConfig = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);

export class TestApp {
  static pgContainer;

  constructor() {
    this.config = null;
    this.routerService = null;
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    await app.listen();
    return app;
  }

  // Run this before all tests.
  static async beforeAll() {
    nock.restore();

    configOverride.server = {
      ...defaultConfig.server,
      hostname: 'localhost',
      port: await portfinder.getPortPromise({
        host: 'localhost',
        startPort: 60000 + (process.pid % 1000),
      }),
    };

    // Redis isn't exercised by the controllers under test.
    configOverride.redis = {
      ...defaultConfig.redis,
      isEnabled: false,
    };

    const isExternalDb = !!process.env.DB_HOST;

    // Check if the database is already set up (i.e. CI).
    if (isExternalDb) {
      configOverride.db = {
        ...defaultConfig.db,
        host: process.env.DB_HOST,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        logging: debug('test:db'),
      };
    } else {
      // Start PostgreSQL container.
      this.pgContainer = await new PostgreSqlContainer('postgres:16').start();

      // Inject database credentials into the config.
      configOverride.db = {
        ...defaultConfig.db,
        host: this.pgContainer.getHost(),
        username: this.pgContainer.getUsername(),
        password: this.pgContainer.getPassword(),
        database: this.pgContainer.getDatabase(),
        port: this.pgContainer.getMappedPort(5432),
        logging: debug('test:db'),
      };
    }

    await TestApp.applyMigrations(configOverride.db);

    nock.activate();
  }

  // Run migrations to set up the database schema.
  static async applyMigrations(dbConfig) {
    const url = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`;

    const output = execSync(`npx sequelize db:migrate --url ${url}/${dbConfig.database} --migrations-path ./migrations`, {
      env: process.env,
    });
    debug('test:migration')(output.toString());
  }

  async init() {
    // Merge config with overrides.
    const config = { ...defaultConfig, ...configOverride };
    this.config = config;
    global.config = config;

    global.redisClient = null;

    // Init log.
    const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, { excludeParams: config.log.excludeParams });
    const log = new Log([consoleLogProvider], ['console']);
    global.log = log;

    global.db = await Db.getInstance(config.db);
  }

  async listen() {
    // Init router.
    this.routerService = new RouterService(this.config);
    await this.routerService.init();
  }

  // Run this before each test.
  static async beforeEach() {
    jest.clearAllMocks();
    nock.cleanAll();
  }

  // Run this after each test.
  static async afterEach() {
    if (nock.pendingMocks().length > 0) {
      throw new Error(`Nock not used: ${nock.pendingMocks().join(', ')}`);
    }
  }

  // Run this after all tests.
  static async afterAll() {
    nock.restore();
    await this.pgContainer?.stop();
  }

  // Obtain a client instance to interact with the application.
  request() {
    const address = `http://${global.config.server.hostname}:${global.config.server.port}`;
    return supertest(address);
  }

  nock(...args: any[]) {
    return nock(...args);
  }

  // Destroy the application.
  async destroy() {
    if (global.db) {
      await global.db.close();
    }
    if (this.routerService?.httpServer) {
      this.routerService.httpServer.close();
    }
  }
}
