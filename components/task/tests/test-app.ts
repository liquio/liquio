import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

import supertest from 'supertest';
import portfinder from 'portfinder';
import pg from 'pg';
import nock from 'nock';
import debug from 'debug';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import amqp from 'amqplib';
import jsonwebtoken from 'jsonwebtoken';
import { resetIdApiClient } from '@liquio/back-core';

import { BpmnTaskCore } from '../src/bootstrap';
import { getConfig, getMessageQueue } from '../src/lib/context';

// E2E tests are slow, so we increase the timeout
jest.setTimeout(120000);

// Mock the log module
jest.mock('@liquio/back-core', () => {
  const debug = require('debug');
  const original = jest.requireActual('@liquio/back-core');
  const { Log: OriginalLog } = original;
  const logs = [];
  return {
    ...original,
    Log: class extends OriginalLog {
      save(...args) {
        debug('test:log')(...args);
        logs.push(args);
      }

      getLogs() {
        return logs;
      }
    },
  };
});

// Mock the configuration module
// The template ships a placeholder download_token secret that the app refuses, so tests use their own.
const configOverride: any = { download_token: { jwtSecret: 'e2e-download-token-secret-0123456789', lifetimeInSeconds: 3600 } };
jest.mock('../src/lib/config', () => {
  const Multiconf = require('multiconf');
  const baseConfig = Multiconf.get('../../config-templates/task');

  const getMerged = () => ({ ...baseConfig, ...configOverride });

  return {
    getConfig: jest.fn().mockImplementation(getMerged),
    loadConfig: jest.fn().mockImplementation(() => {
      return getMerged();
    }),
  };
});

// Obtain the default configuration object

const { getConfig: getTemplateConfig } = require('../src/lib/config');
const defaultConfig = getTemplateConfig();

export class TestApp extends BpmnTaskCore {
  static pgContainer;
  static redisContainer;
  static rabbitmqContainer;

  testAmqpConnection: any;
  testAmqpChannel: any;

  static async setup() {
    // `init` creates the id-api client from this app's config, so drop the one of a previous app.
    resetIdApiClient();
    const app = new TestApp();
    await app.init();
    app.listen();
    return app;
  }

  // Run this before all tests
  static async beforeAll() {
    // Allow testcontainers to talk to docker
    nock.restore();

    configOverride.server = {
      ...defaultConfig.server,
      host: 'localhost',
      port: await portfinder.getPortPromise({
        host: 'localhost',
        startPort: 60000 + (process.pid % 1000),
      }),
    };

    configOverride.auth = {
      ...defaultConfig.auth,
      LiquioId: {
        ...defaultConfig.auth.LiquioId,
        server: 'http://id.local',
        port: 80,
      },
    };

    configOverride.prometheus = {
      isDisabled: true,
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
      };
    } else {
      // Start Redis container
      this.redisContainer = await new RedisContainer('redis:8').start();

      // Inject Redis credentials into the config
      configOverride.redis = {
        ...defaultConfig.redis,
        host: this.redisContainer.getHost(),
        port: this.redisContainer.getMappedPort(6379),
      };
    }

    // Start RabbitMQ container.
    this.rabbitmqContainer = await new RabbitMQContainer('rabbitmq:3-management').start();
    configOverride.message_queue = {
      ...defaultConfig.message_queue,
      amqpConnection: this.rabbitmqContainer.getAmqpUrl(),
      readingQueueName: 'bpmn-task-incoming',
      writingQueueName: 'bpmn-manager-incoming',
      enabledReadingGeneratingPdfMessages: true,
      delayedAutoCommitQueues: { '1s': 1 },
      retryConnectionTime: 60 * 60 * 1000,
    };

    configOverride.iit = {
      useExternal: true,
      externalApi: 'http://sign-tool',
    };

    // Activate nock to intercept HTTP requests
    nock.activate();

    // Setup HTTP request interception
    // nock('http://sign-tool').get('/test/ping').reply(200, 'PONG');
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

    // Install extenstions to the test database
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
            .then((res: any) => `Executed ${res.length} queries`)
            .catch((err) => `Failed to seed data: ${err}`),
        );
      } catch (error) {
        const wrapped: any = new Error(`Unable to load test data: ${error.message}`);
        wrapped.cause = error;
        throw wrapped;
      }
      await client.end();
    }
  }

  // Run this after each test
  static async afterEach() {
    // Fail if not all nocks were used
    if (nock.pendingMocks().length > 0) {
      throw new Error(`Nock not used: ${nock.pendingMocks().join(', ')}`);
    }
  }

  // Run this after each test
  static async beforeEach() {
    jest.clearAllMocks();
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
      jwt: jsonwebtoken.sign(JSON.stringify(payload), getConfig().auth.jwtSecret),
      payload,
    };
  }

  nock(...args) {
    return args.length === 0 ? nock : (nock as any)(...args);
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

  // Get (or open) the single AMQP channel reused by the test helpers below.
  async getTestAmqpChannel() {
    if (!this.testAmqpConnection) {
      this.testAmqpConnection = await amqp.connect(getConfig().message_queue.amqpConnection);
    }
    if (!this.testAmqpChannel) {
      this.testAmqpChannel = await this.testAmqpConnection.createChannel();
    }
    return this.testAmqpChannel;
  }

  // Publish a message to a queue of the app through the test channel.
  async publishMessage(queueName: string, message: object) {
    const channel = await this.getTestAmqpChannel();
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  // Wait until the check returns a truthy value (no fixed sleeps).
  async waitFor<T>(check: () => Promise<T> | T, timeoutMs = 20000, intervalMs = 200): Promise<T> {
    const started = Date.now();
    for (;;) {
      const result = await check();
      if (result) return result;
      if (Date.now() - started > timeoutMs) throw new Error('waitFor: timeout');
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Destroy the application
  async destroy() {
    await this.testAmqpChannel?.close().catch(() => undefined);
    await this.testAmqpConnection?.close().catch(() => undefined);
    const messageQueue: any = getMessageQueue();
    if (messageQueue) {
      await messageQueue.close();
      // Closing fires channel/connection close events which schedule a reconnect; drop it.
      messageQueue.isClosing = true;
      clearTimeout(messageQueue.reconnectTimeout);
    }
    await this.stop();
  }
}
