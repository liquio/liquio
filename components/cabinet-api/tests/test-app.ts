// @ts-nocheck
import http from 'node:http';
import { join } from 'path';
import { randomBytes } from 'crypto';

import supertest = require('supertest');
import * as portfinder from 'portfinder';
import * as pg from 'pg';
import nock = require('nock');
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import * as jsonwebtoken from 'jsonwebtoken';
import multiconf from 'multiconf';

import { bootstrap } from '../src/bootstrap';
import RedisClient from '../src/lib/redis_client';

// E2E tests are slow, so we increase the timeout.
jest.setTimeout(60000);

// Route log output to the debug logger instead of the console.
jest.mock('@liquio/back-core', () => {
  const originalCore = jest.requireActual('@liquio/back-core');
  class MockLog extends originalCore.Log {
    save(...args) {
      require('debug')('test:log')(...args);
    }
  }

  return { ...originalCore, Log: MockLog };
});

const CONFIG_PATH = join(__dirname, '../../../config-templates/cabinet-api');
const defaultConfig = multiconf.get(CONFIG_PATH, 'LIQUIO_CFG_CABINET_TEST_');

// Fake credentials, never real ones.
export const ID_URL = 'http://id.local:8100';
export const TASK_URL = 'http://task.local:8080';
export const NOTIFIER_URL = 'http://notifier.local:8200';
export const JWT_SECRET = 'test-jwt-secret';

const UNITS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER,
    based_on INTEGER[],
    name VARCHAR(255),
    description VARCHAR(255),
    members VARCHAR(255)[],
    heads VARCHAR(255)[],
    data JSON,
    menu_config JSON,
    allow_tokens VARCHAR(255)[],
    heads_ipn VARCHAR(255)[],
    members_ipn VARCHAR(255)[],
    requested_members JSON[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`;

export class TestApp {
  static pgContainer;
  static redisContainer;
  static config;

  constructor() {
    this.server = null;
    this.servers = [];
    this.createServerSpy = null;
  }

  // Run this before all tests. `override` is merged into the template config (top-level sections, shallow).
  static async beforeAll({ redis = false, override = {} } = {}) {
    nock.restore();

    const config = { ...defaultConfig };

    config.server = {
      ...defaultConfig.server,
      hostname: 'localhost',
      port: await portfinder.getPortPromise({ host: 'localhost', startPort: 60000 + (process.pid % 1000) }),
    };

    config.auth = {
      ...defaultConfig.auth,
      LiquioId: { ...defaultConfig.auth.LiquioId, server: 'http://id.local', port: 8100 },
      jwtSecret: JWT_SECRET,
    };

    config.log = { ...defaultConfig.log, console: { name: 'console' } };
    config.discovery = { customApis: [], mainProxy: TASK_URL };
    config.notifier = {
      server: 'http://notifier.local',
      port: 8200,
      user: 'notifier',
      password: 'test-notifier-secret',
      routes: { ping: '/test/ping' },
    };

    if (process.env.DB_HOST) {
      config.db = {
        ...defaultConfig.db,
        host: process.env.DB_HOST,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        logging: false,
      };
    } else {
      this.pgContainer = await new PostgreSqlContainer('postgres:16').start();
      config.db = {
        ...defaultConfig.db,
        host: this.pgContainer.getHost(),
        username: this.pgContainer.getUsername(),
        password: this.pgContainer.getPassword(),
        database: this.pgContainer.getDatabase(),
        port: this.pgContainer.getMappedPort(5432),
        logging: false,
      };
    }
    await TestApp.createSchema(config.db);

    if (redis) {
      if (process.env.REDIS_HOST) {
        config.redis = {
          ...defaultConfig.redis,
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          isEnabled: true,
        };
      } else {
        this.redisContainer = await new RedisContainer('redis:8').start();
        config.redis = {
          ...defaultConfig.redis,
          host: this.redisContainer.getHost(),
          port: this.redisContainer.getMappedPort(6379),
          isEnabled: true,
        };
      }
    } else {
      config.redis = { ...defaultConfig.redis, isEnabled: false };
    }

    this.config = { ...config, ...override };
    nock.activate();
  }

  // There are no migrations in cabinet-api: the `units` table is owned by the manager component.
  static async createSchema(dbConfig) {
    const client = new pg.Client({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    await client.connect();
    await client.query(UNITS_TABLE_SQL);
    await client.end();
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    return app;
  }

  async init() {
    // Capture the HTTP server created by Router, to close it on destroy.
    const originalCreateServer = http.createServer;
    this.createServerSpy = jest.spyOn(http, 'createServer').mockImplementation((...args) => {
      const server = originalCreateServer.apply(http, args);
      this.servers.push(server);
      return server;
    });

    this.config = TestApp.config;
    await bootstrap(this.config);
    this.createServerSpy.mockRestore();
    this.server = this.servers[0];
  }

  static async beforeEach() {
    nock.cleanAll();
  }

  static async afterEach() {
    if (nock.pendingMocks().length > 0) {
      const pending = nock.pendingMocks().join(', ');
      nock.cleanAll();
      throw new Error(`Nock not used: ${pending}`);
    }
  }

  static async afterAll() {
    nock.cleanAll();
    nock.restore();
    await Promise.all([this.pgContainer?.stop(), this.redisContainer?.stop()]);
  }

  request() {
    return supertest(`http://${this.config.server.hostname}:${this.config.server.port}`);
  }

  // Cabinet token (JWT with fake ID tokens inside).
  generateUserToken(userId = 'test-user-1', options = {}) {
    const payload = {
      userId,
      authTokens: {
        accessToken: randomBytes(16).toString('hex'),
        refreshToken: randomBytes(16).toString('hex'),
      },
    };
    return {
      jwt: jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: 3600, ...options }),
      payload,
    };
  }

  nock(...args) {
    return nock(...args);
  }

  get nockId() {
    return nock(ID_URL);
  }

  // Mock ID `/user/info` for the given access token.
  mockUserInfo(accessToken, user = {}) {
    return this.nockId
      .get('/user/info')
      .query({ access_token: accessToken })
      .reply(200, { userId: 'test-user-1', first_name: 'Test', last_name: 'User', email: 'user@example.test', ...user });
  }

  async sql(query, replacements = []) {
    const { QueryTypes } = require('sequelize');
    return global.db.query(query, { replacements, type: QueryTypes.RAW });
  }

  async destroy() {
    if (this.config?.redis?.isEnabled) {
      await new RedisClient({}).close();
    }
    if (global.db) {
      await global.db.close();
    }
    for (const server of this.servers) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  }
}
