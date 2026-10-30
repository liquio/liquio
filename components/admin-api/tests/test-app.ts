// @ts-nocheck
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

import supertest = require('supertest');
import * as portfinder from 'portfinder';
import * as pg from 'pg';
import nock = require('nock');
import createDebug = require('debug');
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import * as jsonwebtoken from 'jsonwebtoken';
import * as Multiconf from 'multiconf';
import { resetIdApiClient } from '@liquio/back-core';

import { MessageQueue } from '../src/lib/message_queue';
import { bootstrap } from '../src/bootstrap';
import { getConfig, getDb, getMessageQueue, getModels, getRedis, getSlaveDb, setAppContext } from '../src/lib/context';

// Token admin-api sends to task in tests (not a real credential).
export const TASK_TOKEN = `Basic ${Buffer.from('admin-api:test-task-secret').toString('base64')}`;

const debug = createDebug;

// E2E tests are slow, so we increase the timeout
jest.setTimeout(30000);

// node-fetch v3 is ESM-only and cannot be loaded by the CommonJS Jest runtime: use the global (undici) fetch, which nock intercepts.
jest.mock('node-fetch', () => {
  const { Readable } = jest.requireActual('stream');
  return {
    __esModule: true,
    // The app expects node-fetch responses: a Node.js stream in `body`.
    default: async (...args) => {
      const response = await fetch(...(args as [any, any]));
      const body = response.body ? Readable.fromWeb(response.clone().body) : null;
      return new Proxy(response, {
        get: (target, prop) => {
          if (prop === 'body') return body;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
    Response: Response,
    AbortError: DOMException,
  };
});

// Mock the log module
jest.mock('@liquio/back-core', () => {
  const originalLog = jest.requireActual('@liquio/back-core');
  const LogClass = originalLog.Log || originalLog.default || originalLog;
  const logs = [];
  class MockLog extends LogClass {
    save(...args) {
      debug('test:log')(...args);
      logs.push(args);
    }

    getLogs() {
      return logs;
    }
  }

  return { ...originalLog, Log: MockLog };
});

// Mock the configuration module
let configOverride = {};
const CONFIG_PATH = process.env.CONFIG_PATH || join(__dirname, '../../../config-templates/admin-api');
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_ADMIN_API';

// Obtain the default configuration object
const defaultConfig = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_HANDLER_`);

export class TestApp {
  static pgContainer;
  static redisContainer;
  static rabbitmqContainer;
  static amqpUrl;

  constructor() {
    this.app = null;
    this.server = null;
    this.routerService = null;
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    app.listen();
    return app;
  }

  // Run this before all tests
  static async beforeAll() {
    nock.restore();

    configOverride.server = {
      ...defaultConfig.server,
      host: 'localhost',
      port: await portfinder.getPortPromise({
        host: 'localhost',
        startPort: 60000 + (process.pid % 1000),
      }),
      token: 'test-token',
    };

    configOverride.auth = {
      ...defaultConfig.auth,
      server: 'http://id-api',
      port: 8100,
      LiquioId: {
        ...defaultConfig.auth.LiquioId,
        server: 'http://id.local',
        port: 80,
      },
      jwtSecret: 'test-jwt-secret',
    };

    configOverride.prometheus = {
      isDisabled: true,
    };

    configOverride.workflow_editor = {
      disabled: false,
    };

    configOverride.mass_messages_mailing = {
      subjectMaxLength: 500,
      fullTextMaxLength: 50000,
    };

    configOverride.assets = {
      encryptCert: 'test-encrypt-cert',
    };

    configOverride.sign = {
      url: 'http://eds-service:80',
      token: 'test-sign-token',
    };

    configOverride.task = {
      ...defaultConfig.task,
      server: 'http://task',
      port: 3000,
      token: TASK_TOKEN,
    };

    configOverride.register = {
      ...defaultConfig.register,
      server: 'http://register',
      port: 8103,
      token: 'Basic cmVnaXN0ZXI6T2FVaVo3MGt1SExq',
    };

    const isExternalDb = !!process.env.DB_HOST;

    // Check if the database is already set up (i.e. Gitlab CI)
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
      // Start PostgreSQL container
      this.pgContainer = await new PostgreSqlContainer('postgres:16').start();

      // Inject database credentials into the config
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

    await TestApp.applyMigrations(isExternalDb, configOverride.db);

    if (process.env.REDIS_HOST) {
      // Use the existing Redis connection
      configOverride.redis = {
        ...defaultConfig.redis,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        isEnabled: true,
      };
    } else {
      // Start Redis container
      this.redisContainer = await new RedisContainer('redis:8').start();

      // Inject Redis credentials into the config
      configOverride.redis = {
        ...defaultConfig.redis,
        host: this.redisContainer.getHost(),
        port: this.redisContainer.getMappedPort(6379),
        isEnabled: true,
      };
    }

    // Start RabbitMQ container.
    this.rabbitmqContainer = await new RabbitMQContainer('rabbitmq:3-management').start();
    this.amqpUrl = this.rabbitmqContainer.getAmqpUrl();
    configOverride.message_queue = {
      ...defaultConfig.message_queue,
      amqpConnection: this.amqpUrl,
      writingQueueManager: 'test-admin-to-manager',
      writingQueueTask: 'test-admin-to-task',
      writingQueueEvent: 'test-admin-to-event',
      writingQueueGateway: 'test-admin-to-gateway',
    };

    nock.activate();
  }

  static async applyMigrations(isExternalDb, dbConfig) {
    const url = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`;

    // Add needed extensions at the database level
    const client = new pg.Client({
      connectionString: `${url}/${dbConfig.database}`,
    });
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;');

    // Create a unique database for each test run
    if (isExternalDb) {
      const uniqueDbName = `test_db_${randomBytes(8).toString('hex')}`;
      await client.query(`CREATE DATABASE ${uniqueDbName};`);
      dbConfig.database = uniqueDbName;
    }
    await client.end();

    // Install extensions to the test database
    if (isExternalDb) {
      const client = new pg.Client({
        connectionString: `${url}/${dbConfig.database}`,
      });
      await client.connect();
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;');
      await client.end();
    }

    // Run migrations to setup the database schema
    const output = execSync(`npx sequelize db:migrate --url ${url}/${dbConfig.database} --migrations-path ../manager/migrations`, {
      env: process.env,
    });
    debug('test:migration')(output.toString());

    // Run seeders to setup the database data
    {
      const client = new pg.Client({
        connectionString: `${url}/${dbConfig.database}`,
      });
      await client.connect();
      try {
        const testData = readFileSync('../manager/data/test.e2e.sql', 'utf8');
        debug('test:db')(
          await client
            .query(testData)
            .then((res) => `Executed ${res.length} queries`)
            .catch((err) => `Failed to seed data: ${err}`),
        );
      } catch (error) {
        throw new Error(`Unable to load test data: ${error.message}`, { cause: error });
      }
      await client.end();
    }
  }

  async init() {
    // Merge config with overrides
    const config = { ...defaultConfig, ...configOverride };
    this.config = config;
    setAppContext({ config });

    // Init id-api client from scratch for every app instance.
    resetIdApiClient();

    const { routerService } = await bootstrap(config);
    this.routerService = routerService;
    this.models = { models: getModels() };
  }

  async listen() {
    // Router is initialized by bootstrap.
  }

  // Run this after each test
  static async beforeEach() {
    jest.clearAllMocks();
    nock.cleanAll();
  }

  // Run this after each test
  static async afterEach() {
    if (nock.pendingMocks().length > 0) {
      throw new Error(`Nock not used: ${nock.pendingMocks().join(', ')}`);
    }
  }

  // Run this after all tests
  static async afterAll() {
    nock.restore();
    await Promise.all([this.pgContainer?.stop(), this.redisContainer?.stop(), this.rabbitmqContainer?.stop()]);
  }

  // Obtain a client instance to interact with the application
  request() {
    const address = `http://${getConfig().server.host}:${getConfig().server.port}`;
    return supertest(address);
  }

  // Generate a JWT token for a user
  generateUserToken(userId) {
    const payload = {
      userId,
      authTokens: {
        accessToken: randomBytes(32).toString('hex'),
        refreshToken: randomBytes(32).toString('hex'),
      },
    };
    return {
      jwt: jsonwebtoken.sign(payload, getConfig().auth.jwtSecret),
      payload,
    };
  }

  nock(...args: any[]) {
    return nock(...args);
  }

  /**
   * Getter that creates and returns a nock instance configured for the LiquioId auth server.
   *
   * @returns {import('nock').Scope}
   */
  get nockId() {
    const { server, port } = getConfig().auth.LiquioId;
    return nock(`${server}:${port}`);
  }

  model(modelName) {
    const model = this.models?.models?.[modelName]?.model;
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    return model;
  }

  // Destroy the application
  async destroy() {
    const mq = getMessageQueue();
    if (mq) {
      await mq.close();
      // Prevent reconnect timers after the connection is closed.
      mq.isClosing = true;
      clearTimeout(mq.reconnectTimeout);
      MessageQueue.singleton = undefined;
      setAppContext({ messageQueue: undefined });
    }
    if (getRedis()) {
      await getRedis().close();
    }
    if (getDb()) {
      await getDb().close();
    }
    if (getSlaveDb()) {
      await getSlaveDb().close();
    }
    const { wss, server } = this.routerService || {};
    if (wss) {
      wss.clients.forEach((client) => client.terminate());
      await new Promise((resolve) => wss.close(resolve));
    }
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  }
}
