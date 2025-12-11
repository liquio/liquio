const pg = require('pg');
const nock = require('nock');
const debug = require('debug');
const crypto = require('crypto');
const { readFileSync } = require('fs');
const { execSync } = require('child_process');
const { merge } = require('lodash');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { RedisContainer } = require('@testcontainers/redis');

const { prepareFixtures } = require('./fixtures');

// E2E tests are slow, so we increase the timeout
jest.setTimeout(30000);

// Mock the RabbitMQ connection
jest.mock('../src/lib/message_queue', () => {
  return jest.fn().mockImplementation(() => {
    return {
      init: jest.fn(),
      produce: jest.fn(),
    };
  });
});

// Mock the log module
jest.mock('../src/lib/log', () => {
  const debug = require('debug');
  const originalLog = jest.requireActual('../src/lib/log');
  const logs = [];
  return class extends originalLog {
    save(...args) {
      debug('test:log')(...args);
      logs.push({ type: args[0], data: args[1] });
    }

    get logs() {
      return logs;
    }

    clear() {
      logs.length = 0;
    }
  };
});

jest.mock('../src/lib/log/providers/console', () => {
  const debug = require('debug');
  const originalConsole = jest.requireActual('../src/lib/log/providers/console');
  return class extends originalConsole {
    save(timestamp, ...args) {
      debug('test:log')(...args);
    }
  };
});

// Mock the configuration module
let configOverride = {};
jest.mock('../src/lib/config', () => {
  const Multiconf = require('multiconf');
  const baseConfig = Multiconf.get('../config-templates/event');

  const getMerged = () => ({ ...baseConfig, ...configOverride });

  return {
    getConfig: jest.fn().mockImplementation(getMerged),
    loadConfig: jest.fn().mockImplementation(() => {
      global.config = getMerged();
      return global.config;
    }),
  };
});

// Mock filestorage uploadFileFromStream
// This mock captures stream content and generates real UUID v4, MD5, and SHA1 hashes
// Usage: const { mockFilestorageUploadSpy } = require('./test-app');
// Access captured data: mockFilestorageUploadSpy.capturedContent, .capturedName, etc.
// Access generated values: mockFilestorageUploadSpy.generatedFileId, .generatedMd5, .generatedSha1
const mockFilestorageUploadSpy = jest.fn();
jest.mock('../src/lib/filestorage', () => {
  const crypto = require('crypto');
  const originalFilestorage = jest.requireActual('../src/lib/filestorage');
  return class extends originalFilestorage {
    constructor(...args) {
      super(...args);
      // Create a spy for uploadFileFromStream that captures stream content
      this.uploadFileFromStream = mockFilestorageUploadSpy.mockImplementation(
        async (readableStream, name, description, contentType, contentLength) => {
          // Read and capture the stream content for testing
          const chunks = [];
          for await (const chunk of readableStream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          const content = buffer.toString();

          // Store captured data on the spy for test inspection
          mockFilestorageUploadSpy.capturedContent = content;
          mockFilestorageUploadSpy.capturedName = name;
          mockFilestorageUploadSpy.capturedDescription = description;
          mockFilestorageUploadSpy.capturedContentType = contentType;
          mockFilestorageUploadSpy.capturedContentLength = contentLength;

          // Mock successful upload
          const fileId = crypto.randomUUID();
          const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
          const sha1Hash = crypto.createHash('sha1').update(buffer).digest('hex');

          // Store generated values on spy for test inspection
          mockFilestorageUploadSpy.generatedFileId = fileId;
          mockFilestorageUploadSpy.generatedMd5 = md5Hash;
          mockFilestorageUploadSpy.generatedSha1 = sha1Hash;

          return {
            id: fileId,
            name,
            contentType,
            contentLength,
            hash: { md5: md5Hash, sha1: sha1Hash },
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      );
    }
  };
});

// Obtain the default configuration object
const { getConfig } = require('../src/lib/config');
const defaultConfig = getConfig();

class TestApp extends require('../src/app') {
  static pgContainer;
  static redisContainer;

  // Initialize the application
  static async setup(configOverrides = {}) {
    const baseConfig = getConfig();
    const mergedConfig = merge({}, baseConfig, configOverrides);
    const app = new TestApp(mergedConfig);
    await app.init();
    return app;
  }

  /**
   * Create a standardized error handler for catch blocks.
   * @param {string} message Error message to log
   * @param {boolean} isDumpStack Whether to dump error stack trace
   * @returns {Function} Arrow function for use in catch blocks
   */
  static catch(message, isDumpStack = false) {
    return (error) => {
      const testName = expect.getState().currentTestName || 'Unknown Test';
      const fullMessage = `[${testName}] ${message}`;
      let errorDetails = error.message || '';
      if (error.errors) {
        errorDetails += '\n  Errors: ' + JSON.stringify(error.errors, null, 2);
      }
      if (!errorDetails) {
        errorDetails = JSON.stringify(error, null, 2);
      }
      console.error(fullMessage, errorDetails);
      if (isDumpStack) {
        console.error(error.stack);
      }
      throw error;
    };
  }

  // Run this before all tests
  static async beforeAll() {
    // Allow testcontainers to talk to docker
    nock.restore();

    configOverride.app = {
      enabledRunDaemonMode: false,
    };

    configOverride.notifier = {
      email: { ...defaultConfig.notifier.email, server: 'http://notify.local', port: 80 },
      sms: { ...defaultConfig.notifier.sms, server: 'http://notify.local', port: 80 },
      digest: { ...defaultConfig.notifier.digest, server: 'http://mailer.local', port: 80 },
    };

    configOverride.requester = {
      ...defaultConfig.requester,
      registers: { ...defaultConfig.requester.registers, url: 'http://register.local' },
      externalService: {
        ...defaultConfig.requester.externalService,
      },
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
      };
    }

    {
      const url = `postgres://${configOverride.db.username}:${configOverride.db.password}@${configOverride.db.host}:${configOverride.db.port}`;

      // Add needed extensions at the database level
      const client = new pg.Client({
        connectionString: `${url}/${configOverride.db.database}`,
      });
      await client.connect();
      await client.query(
        'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;',
      );

      // Create a unique database for each test run
      if (isExternalDb) {
        const uniqueDbName = `test_db_${crypto.randomBytes(8).toString('hex')}`;
        await client.query(`CREATE DATABASE ${uniqueDbName};`);
        configOverride.db.database = uniqueDbName;
      }
      await client.end();

      // Install extenstions to the test database
      if (isExternalDb) {
        const client = new pg.Client({
          connectionString: `${url}/${configOverride.db.database}`,
        });
        await client.connect();
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;');
        await client.end();
      }

      // Run migrations to setup the database schema
      const output = execSync(
        `npx sequelize db:migrate --url ${url}/${configOverride.db.database} --migrations-path ../manager/migrations`,
        { env: process.env },
      );
      debug('test:migration')(output.toString());

      // Run seeders to setup the database data
      {
        const client = new pg.Client({
          connectionString: `${url}/${configOverride.db.database}`,
        });
        await client.connect();
        try {
          const testData = readFileSync('../manager/data/test.e2e.sql', 'utf8');
          debug('test:db')(
            await client.query(testData)
              .then((res) => `Executed ${res.length} queries`)
              .catch((err) => `Failed to seed data: ${err}`)
          );
        } catch (error) {
          throw new Error(`Unable to load test data: ${error.message}`);
        }
        await client.end();
      }
    }

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
    // Activate nock to intercept HTTP requests
    nock.activate();
  }

  // Run this after each test
  static async beforeEach(app) {
    // Log the test name
    debug('test:test')(expect.getState().currentTestName);

    // Clear jest mocks
    jest.clearAllMocks();

    // Clear nock interceptors
    nock.cleanAll();

    // Clear the app log
    app?.log.clear();
  }

  // Run this after each test
  static async afterEach() {
    // Fail if not all nocks were used
    if (nock.pendingMocks().length > 0) {
      throw new Error(`Nock not used: ${nock.pendingMocks().join(', ')}`);
    }
  }

  // Run this after all tests
  static async afterAll(app) {
    // Stop the application
    await app?.destroy();

    // Disable nock to allow testcontainers to talk to docker
    nock.restore();

    // Stop containers
    await Promise.all([this.pgContainer?.stop(), this.redisContainer?.stop()]);
  }

  model(modelName) {
    const model = this.models?.models?.[modelName]?.model;
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    return model;
  }

  nock(...args) {
    return args.length === 0 ? nock : nock(...args);
  }

  get nockRegister() {
    return nock('http://register.local');
  }

  get nockNotify() {
    return nock('http://notify.local');
  }

  async init() {
    this.useGlobalErrors();
    this.useGlobalTypeOf();
    this.useLog();
    this.useHttpClient();
    await this.useDb();
    this.useModels();
    this.useEventService();
    this.useEventBusiness();
    this.useMessageQueue();
  }

  // Destroy the application
  async destroy() {
    this.eventBusiness.stopDaemon();
  }

  // Load test fixtures into the database
  async loadFixtures() {
    await prepareFixtures(this);
  }
}

module.exports = { TestApp, mockFilestorageUploadSpy };
