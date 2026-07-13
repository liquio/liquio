// @ts-nocheck
import supertest from 'supertest';
import * as portfinder from 'portfinder';
import * as pg from 'pg';
import nock from 'nock';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import createDebug from 'debug';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as Multiconf from 'multiconf';

import { ConsoleLogProvider } from '../src/lib/log/providers/console';
import { Log } from '../src/lib/log';

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

// Point every still-eager `import { conf } from '../config/config'` (several controllers do this
// at module scope) at the tracked config-templates directory rather than the gitignored, optional
// `config/notification` directory a local dev checkout may or may not have populated.
process.env.CONFIG_PATH = path.join(__dirname, '../../config-templates/notification');

// Jest force-sets NODE_ENV=test if nothing else set it, before any test file runs. config.ts
// resolves its env block as `process.env.NODE_ENV || mergedConfig.default_env`, so that forced
// "test" wins over "default_env": "production" in config-templates/notification/config.json,
// which has no "test" block - every eager `import { conf } from '../config/config'` would throw
// "Variable currentEnvConf.db is not defined." the moment it loads. Since that template only
// defines "production", resolve to it explicitly here rather than adding an unused "test" block.
if (process.env.NODE_ENV === 'test') {
  process.env.NODE_ENV = 'production';
}

const CONFIG_TEMPLATE_PATH = process.env.CONFIG_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_NOTIFICATION';

// Obtain the default configuration object the same way src/config/config.ts does, without
// importing that module directly - it has its own CONFIG_PATH resolution and side effects we
// don't want to entangle this harness with.
const rawConfig: any = Multiconf.get(CONFIG_TEMPLATE_PATH, `${LIQUIO_CONFIG_PREFIX}_`).config;
const defaultEnv = rawConfig.default_env || 'production';
const versionsConfText = readFileSync(path.join(__dirname, '../src/config/versions.json.default'), 'utf8');
const versionsConf = JSON.parse(versionsConfText || '{}');
const defaultConf = { ...rawConfig[defaultEnv], ...versionsConf };

const confOverride: any = {};

export class TestApp {
  static pgContainer;

  server: any;
  log: any;

  constructor() {
    this.server = null;
    this.log = null;
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

    const isExternalDb = !!process.env.DB_HOST;

    // Check if the database is already set up (i.e. CI).
    if (isExternalDb) {
      confOverride.db = {
        ...defaultConf.db,
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
      confOverride.db = {
        ...defaultConf.db,
        host: this.pgContainer.getHost(),
        username: this.pgContainer.getUsername(),
        password: this.pgContainer.getPassword(),
        database: this.pgContainer.getDatabase(),
        port: this.pgContainer.getMappedPort(5432),
        logging: debug('test:db'),
      };
    }

    await TestApp.applyMigrations(confOverride.db);

    confOverride.port = await portfinder.getPortPromise({
      host: 'localhost',
      startPort: 60000 + (process.pid % 1000),
    });

    nock.activate();
  }

  // Run migrations to set up the database schema.
  static async applyMigrations(dbConfig) {
    const url = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`;

    const output = execSync(`npx sequelize db:migrate --url ${url}/${dbConfig.database} --migrations-path ./migrations`, {
      env: process.env,
    });
    debug('test:migration')(output.toString());

    // Confirm the connection is actually usable before handing it to the app.
    const client = new pg.Client({ connectionString: `${url}/${dbConfig.database}` });
    await client.connect();
    await client.end();
  }

  async init() {
    // Merge config with overrides, mirroring src/app.ts's `{conf, env}` shape.
    const conf = { ...defaultConf, ...confOverride };
    const config = { conf, env: defaultEnv };

    // Init log the same way src/index.ts does, before anything that might read global.log.
    const consoleLogProvider = new ConsoleLogProvider(conf.log?.console?.name, { excludeParams: conf.log?.excludeParams });
    const log = new Log([consoleLogProvider], ['console']);
    this.log = log;
    global.log = log;

    // Deferred require: src/app.ts's start() sets global.conf/env/adminStaticDir/extensions and
    // only then requires src/server.ts (and, transitively, every model's DB connection) - importing
    // it statically here would run that boot sequence before global.log/global.conf are ready.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const start = require('../src/app').default;
    this.server = start(config, undefined, {});
  }

  async listen() {
    const { port } = confOverride;
    await new Promise((resolve) => {
      this.server.listen(port, () => resolve(undefined));
    });
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
    return supertest(this.server.url);
  }

  nock(...args: any[]) {
    return nock(...args);
  }

  // Destroy the application.
  async destroy() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connection } = require('../src/models/DB');
    await connection?.close();
  }
}
