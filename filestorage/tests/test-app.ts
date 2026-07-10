// @ts-nocheck
import supertest from 'supertest';
import * as portfinder from 'portfinder';
import * as pg from 'pg';
import { execSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import createDebug from 'debug';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as Multiconf from 'multiconf';

import { Db } from '../src/lib/db';
import { Log } from '../src/lib/log';
import { ConsoleLogProvider } from '../src/lib/log/providers/console';
import { Providers } from '../src/providers';
import { Models } from '../src/models';
import { Router } from '../src/router';

const debug = createDebug;

// E2E tests are slow, so we increase the timeout.
jest.setTimeout(30000);

// Mock the log module, so tests don't spam the console and can hook into specific saved entries.
jest.mock('../src/lib/log', () => {
  const { Log: OriginalLog } = jest.requireActual('../src/lib/log');
  const logs = [];
  const emitter = new EventEmitter();

  class MockLog extends OriginalLog {
    save(...args) {
      debug('test:log')(...args);
      logs.push(args);
      emitter.emit(args[0], args);
      return Promise.resolve();
    }

    getLogs() {
      return logs;
    }

    // Resolve as soon as a log entry of the given type is saved (or immediately, if one already was).
    waitForLog(type, timeoutMs = 5000) {
      const existing = logs.find(([entryType]) => entryType === type);
      if (existing) return Promise.resolve(existing);

      return new Promise((resolve, reject) => {
        const onLog = (args) => {
          clearTimeout(timeout);
          resolve(args);
        };
        const timeout = setTimeout(() => {
          emitter.off(type, onLog);
          reject(new Error(`Timed out waiting for a "${type}" log entry.`));
        }, timeoutMs);

        emitter.once(type, onLog);
      });
    }
  }

  return { Log: MockLog };
});

const CONFIG_PATH = process.env.CONFIG_PATH || '../config-templates/filestorage';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_FILESTORAGE';
const ENV_PREFIX = `${LIQUIO_CONFIG_PREFIX}_`;

export class TestApp {
  static pgContainer;

  config: any;
  log: any;
  providers: any;
  models: any;
  routerService: any;

  constructor() {
    this.config = null;
    this.log = null;
    this.providers = null;
    this.models = null;
    this.routerService = null;
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    await app.listen();
    return app;
  }

  // Run this before all tests. Overrides are pushed through env vars (Multiconf's own override
  // mechanism, see node_modules/multiconf's README), so both our own config object below and
  // src/lib/config.ts's separate module-level singleton (used by Preview's no-arg constructor)
  // resolve to the exact same values.
  static async beforeAll() {
    // Read the base template once, only to compute full override objects to push back as env vars.
    const templateConfig = Multiconf.get(CONFIG_PATH, ENV_PREFIX);

    process.env.CONFIG_PATH = CONFIG_PATH;
    process.env.LIQUIO_CONFIG_PREFIX = LIQUIO_CONFIG_PREFIX;

    process.env[`${ENV_PREFIX}server`] = JSON.stringify({
      ...templateConfig.server,
      hostname: 'localhost',
      port: await portfinder.getPortPromise({
        host: 'localhost',
        startPort: 60000 + (process.pid % 1000),
      }),
    });

    // No external file storage provider is exercised by the controllers under test.
    process.env[`${ENV_PREFIX}providers`] = JSON.stringify({
      ...templateConfig.providers,
      activeProvider: null,
    });

    // Point the preview service at a closed local port, so tests exercise its
    // error-handling path deterministically instead of depending on real network access.
    process.env[`${ENV_PREFIX}preview`] = JSON.stringify({
      ...templateConfig.preview,
      server: 'http://127.0.0.1:1',
      timeout: 1000,
    });

    const isExternalDb = !!process.env.DB_HOST;
    let dbConfig;

    // Check if the database is already set up (i.e. CI).
    if (isExternalDb) {
      dbConfig = {
        ...templateConfig.db,
        host: process.env.DB_HOST,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        logging: false,
      };
    } else {
      // Start PostgreSQL container.
      this.pgContainer = await new PostgreSqlContainer('postgres:16').start();

      // Inject database credentials into the config.
      dbConfig = {
        ...templateConfig.db,
        host: this.pgContainer.getHost(),
        username: this.pgContainer.getUsername(),
        password: this.pgContainer.getPassword(),
        database: this.pgContainer.getDatabase(),
        port: this.pgContainer.getMappedPort(5432),
        logging: false,
      };
    }

    process.env[`${ENV_PREFIX}db`] = JSON.stringify(dbConfig);

    await TestApp.applyMigrations(dbConfig);
  }

  // Run migrations and seed a default container to set up the database schema and data.
  static async applyMigrations(dbConfig) {
    const url = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`;

    const output = execSync(`npx sequelize db:migrate --url ${url}/${dbConfig.database} --migrations-path ./migrations`, {
      env: process.env,
    });
    debug('test:migration')(output.toString());

    // Seed the default container (id=1), mirroring src/seeders/201903041636-default-container.js.
    const client = new pg.Client({ connectionString: `${url}/${dbConfig.database}` });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO containers (id, name, description, meta, created_by, updated_by, created_at, updated_at)
         VALUES (1, 'default', 'Default container', '{}', 'system', 'system', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
      );
      // Advance the id sequence past the manually-inserted row, so subsequent auto-increments don't collide with it.
      await client.query('SELECT setval(pg_get_serial_sequence(\'containers\', \'id\'), (SELECT MAX(id) FROM containers))');
    } finally {
      await client.end();
    }
  }

  async init() {
    // Load config the same way src/app.ts does, so it resolves to the exact env-var-overridden
    // values set in beforeAll() above — including for classes (e.g. Preview) that re-derive
    // config from this same module-level singleton instead of receiving it via constructor args.
    const { initialize: initializeConfig } = await import('../src/lib/config');
    const config = initializeConfig();
    this.config = config;

    // Init log.
    const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: config.log.excludeParams });
    const log = new Log([consoleLogProvider], ['console']);
    this.log = log;
    global.log = log;

    global.db = await Db.getInstance(config.db);

    // Init providers.
    this.providers = new Providers(config.providers);
    this.providers.init();

    // Init models.
    this.models = new Models(config, this.providers.activeProvider);
    this.models.init();
  }

  async listen() {
    // Init router.
    this.routerService = new Router(this.config);
    await this.routerService.init();
  }

  // Run this before each test.
  static async beforeEach() {
    jest.clearAllMocks();
  }

  // Run this after all tests.
  static async afterAll() {
    await this.pgContainer?.stop();
  }

  // Obtain a client instance to interact with the application.
  request() {
    const address = `http://${this.config.server.hostname}:${this.config.server.port}`;
    return supertest(address);
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
