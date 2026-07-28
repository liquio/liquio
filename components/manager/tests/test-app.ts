// @ts-nocheck
import supertest from 'supertest';
import * as portfinder from 'portfinder';
import * as pg from 'pg';
import amqp from 'amqplib';
import nock from 'nock';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import createDebug from 'debug';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import * as Multiconf from 'multiconf';

import { Db } from '../src/lib/db';
import { Log } from '../src/lib/log';
import { ConsoleLogProvider } from '../src/lib/log/providers/console';
import { MessageQueue } from '../src/lib/message_queue';
import { RouterService } from '../src/services/router';
import { WorkflowBusiness } from '../src/businesses/workflow';

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

// Mock the configuration module.
const configOverride: any = {};
const CONFIG_PATH = process.env.CONFIG_PATH || '../config-templates/manager';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_MANAGER';

// Obtain the default configuration object.
const defaultConfig = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);

export class TestApp {
  static pgContainer;
  static rabbitmqContainer;

  config: any;
  log: any;
  routerService: any;
  messageQueue: any;
  workflowBusiness: any;
  testAmqpConnection: any;
  testAmqpChannel: any;

  constructor() {
    this.config = null;
    this.log = null;
    this.routerService = null;
    this.messageQueue = null;
    this.workflowBusiness = null;
    this.testAmqpConnection = null;
    this.testAmqpChannel = null;
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

    // Start RabbitMQ container.
    this.rabbitmqContainer = await new RabbitMQContainer('rabbitmq:3-management').start();

    configOverride.message_queue = {
      ...defaultConfig.message_queue,
      amqpConnection: this.rabbitmqContainer.getAmqpUrl(),
    };

    nock.activate();
  }

  // Run migrations and load fixtures to set up the database schema and data.
  static async applyMigrations(dbConfig) {
    const url = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}`;

    const output = execSync(`npx sequelize db:migrate --url ${url}/${dbConfig.database} --migrations-path ./migrations`, {
      env: process.env,
    });
    debug('test:migration')(output.toString());

    // Load fixture data shared with admin-api's e2e tests.
    const client = new pg.Client({ connectionString: `${url}/${dbConfig.database}` });
    await client.connect();
    try {
      const testData = readFileSync('./data/test.e2e.sql', 'utf8');
      debug('test:db')(
        await client
          .query(testData)
          .then((res) => `Executed ${res.length} queries`)
          .catch((err) => `Failed to seed data: ${err}`),
      );
    } finally {
      await client.end();
    }
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
    this.log = log;
    global.log = log;

    global.db = await Db.getInstance(config.db);

    // Init workflow business.
    this.workflowBusiness = new WorkflowBusiness();
    await this.workflowBusiness.init();

    // Init message queue, mirroring src/index.ts's boot sequence.
    this.messageQueue = new MessageQueue(config.message_queue, {
      onInit: () => {
        this.messageQueue.subscribeToConsuming(this.workflowBusiness.createFromMessage.bind(this.workflowBusiness));
      },
    });
    await this.messageQueue.init();
    global.messageQueue = this.messageQueue;
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
    await Promise.all([this.pgContainer?.stop(), this.rabbitmqContainer?.stop()]);
  }

  // Obtain a client instance to interact with the application.
  request() {
    const address = `http://${global.config.server.hostname}:${global.config.server.port}`;
    return supertest(address);
  }

  nock(...args: any[]) {
    return nock(...args);
  }

  // Get (or open) the single AMQP connection reused by the test helpers below.
  async getTestConnection() {
    if (!this.testAmqpConnection) {
      this.testAmqpConnection = await amqp.connect(this.config.message_queue.amqpConnection);
    }
    return this.testAmqpConnection;
  }

  // Publish a message directly to the reading queue, as an upstream service (task/gateway/event) would.
  async publishToReadingQueue(message) {
    if (!this.testAmqpChannel) {
      const connection = await this.getTestConnection();
      this.testAmqpChannel = await connection.createChannel();
    }
    await this.testAmqpChannel.assertQueue(this.config.message_queue.readingQueueName, { durable: true });
    this.testAmqpChannel.sendToQueue(this.config.message_queue.readingQueueName, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  // Wait for and return the next message produced onto the given writing queue. Uses its own
  // channel so the consumer it registers can't linger and steal a later test's message.
  async consumeFromQueue(queueName, timeoutMs = 10000): Promise<any> {
    const connection = await this.getTestConnection();
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.close().finally(() => reject(new Error(`Timed out waiting for a message on "${queueName}".`)));
      }, timeoutMs);

      channel.consume(queueName, (msg) => {
        if (!msg) return;
        clearTimeout(timeout);
        channel.ack(msg);
        channel.close().finally(() => resolve(JSON.parse(msg.content.toString())));
      });
    });
  }

  // Destroy the application.
  async destroy() {
    if (this.testAmqpChannel) {
      await this.testAmqpChannel.close();
    }
    if (this.testAmqpConnection) {
      await this.testAmqpConnection.close();
    }
    if (this.messageQueue) {
      await this.messageQueue.close();
    }
    if (global.db) {
      await global.db.close();
    }
    if (this.routerService?.httpServer) {
      this.routerService.httpServer.close();
    }
  }
}
