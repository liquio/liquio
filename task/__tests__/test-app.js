const supertest = require('supertest');
const portfinder = require('portfinder');
const pg = require('pg');
const nock = require('nock');
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const debug = require('debug');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { RedisContainer } = require('@testcontainers/redis');
const { randomBytes } = require('crypto');
const jsonwebtoken = require('jsonwebtoken');

const BpmnTaskCore = require('../src/app');

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
      logs.push(args);
    }

    getLogs() {
      return logs;
    }
  };
});

// Mock the configuration module
let configOverride = {};
jest.mock('../src/lib/config', () => {
  const Multiconf = require('multiconf');
  const baseConfig = Multiconf.get('../config-templates/task');

  const getMerged = () => ({ ...baseConfig, ...configOverride });

  return {
    getConfig: jest.fn().mockImplementation(getMerged),
    loadConfig: jest.fn().mockImplementation(() => {
      global.config = getMerged();
      return global.config;
    }),
  };
});

// Obtain the default configuration object
const { getConfig } = require('../src/lib/config');
const defaultConfig = getConfig();

class TestApp extends BpmnTaskCore {
  static pgContainer;
  static redisContainer;

  static async setup() {
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
      }
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
      const uniqueDbName = `test_db_${crypto.randomBytes(8).toString('hex')}`;
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
            .then((res) => `Executed ${res.length} queries`)
            .catch((err) => `Failed to seed data: ${err}`),
        );
      } catch (error) {
        throw new Error(`Unable to load test data: ${error.message}`, { cause: error });
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
    await Promise.all([this.pgContainer?.stop(), this.redisContainer?.stop()]);
  }

  // Obtain a client instance to interact with the application
  request() {
    const address = `http://${config.server.host}:${config.server.port}`;
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
      jwt: jsonwebtoken.sign(JSON.stringify(payload), config.auth.jwtSecret),
      payload,
    };
  }

  nock(...args) {
    return args.length === 0 ? nock : nock(...args);
  }

  /**
   * Getter that creates and returns a nock instance configured for the LiquioId auth server.
   *
   * @returns {import('nock').Scope}
   */
  get nockId() {
    const { server, port } = config.auth.LiquioId;
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
    await this.stop();
  }
}

module.exports = { TestApp };
