import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import debug from 'debug';
import nock from 'nock';
import pg from 'pg';
import portfinder from 'portfinder';
import supertest from 'supertest';

import { Application } from '../src/application';
import { Config } from '../src/config';
import { AuthMiddleware } from '../src/middleware';
import { Models } from '../src/models';
import { Services } from '../src/services';
import baseConfig from './base.config.json';

let logs: any[] = [];
jest.mock('../src/lib/log', () => {
  const debugLog = debug('test:log');
  const debugReq = debug('test:request');
  const mockLog = jest.fn();
  const mockLogInstance = {
    save: jest.fn((type, data, level = 'info') => {
      logs.push({ type, data, level });
      if (process.env.DEBUG) {
        debugLog(`[${level}] ${type}`, data ?? '');
      }
    }),
    logRouter: jest.fn((req, res, next) => {
      debugReq(req.method, req.url);
      next();
    }),
    get: jest.fn(() => mockLog),
  };

  return {
    Log: {
      get: jest.fn(() => mockLogInstance),
      save: jest.fn(),
      logRouter: jest.fn(),
    },
    useRequestLogger: jest.fn(() => (req: any, res: any, next: any) => next()),
  };
});

export const config: Config = baseConfig as Config;
jest.mock('../src/config', () => {
  return {
    loadConfig: jest.fn(() => config),
  };
});

jest.setTimeout(30000);

export class TestApp extends Application {
  private static pgContainer: StartedPostgreSqlContainer;
  private static redisContainer: StartedRedisContainer;
  private static dexContainer: StartedTestContainer;
  private static dexConfigPath: string;
  public static dexUrl: string;

  constructor() {
    super(config);
  }

  static get logs() {
    return logs;
  }

  static clearLogs() {
    logs = [];
  }

  static async setup() {
    const app = new TestApp();
    await app.init();
    app.listen();
    return app;
  }

  static async beforeAll() {
    // Allow testcontainers to talk to docker
    nock.restore();

    config.port = await portfinder.getPortPromise({ host: 'localhost', startPort: 60000 + (process.pid % 1000) });

    // Check if the database is already set up (i.e. Gitlab CI)
    if (process.env.DB_HOST) {
      // Use the existing database connection
      config.db.host = process.env.DB_HOST;
      config.db.username = process.env.DB_USER!;
      config.db.password = process.env.DB_PASSWORD!;
      config.db.database = process.env.DB_NAME!;
      config.db.port = parseInt(process.env.DB_PORT || '5432', 10);
    } else {
      // Start PostgreSQL container
      this.pgContainer = await new PostgreSqlContainer('postgres:16').start();

      // Inject database credentials into the config
      config.db.username = this.pgContainer.getUsername();
      config.db.database = this.pgContainer.getDatabase();
      config.db.password = this.pgContainer.getPassword();
      config.db.port = this.pgContainer.getMappedPort(5432);
    }

    {
      const url = `postgres://${config.db.username}:${config.db.password}@${config.db.host}:${config.db.port}`;

      // Add needed extensions at the database level
      {
        const client = new pg.Client({ connectionString: `${url}/${config.db.database}` });
        await client.connect();
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;');

        // Create a unique database for each test run
        if (process.env.DB_HOST) {
          const uniqueDbName = `test_db_${crypto.randomBytes(8).toString('hex')}`;
          await client.query(`CREATE DATABASE ${uniqueDbName};`);
          config.db.database = uniqueDbName;
        }
        await client.end();
      }

      // Install extenstions to the test database
      if (process.env.DB_HOST) {
        const client = new pg.Client({ connectionString: `${url}/${config.db.database}` });
        await client.connect();
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA pg_catalog;');
        await client.end();
      }

      // Run migrations to setup the database schema
      const output = execSync(`npx sequelize db:migrate --url ${url}/${config.db.database}`, { env: process.env });
      debug('test:migration')(output.toString());
    }

    if (process.env.REDIS_HOST) {
      // Use the existing Redis connection
      config.redis.host = process.env.REDIS_HOST;
      config.redis.port = parseInt(process.env.REDIS_PORT || '6379', 10);
    } else {
      // Start Redis container
      this.redisContainer = await new RedisContainer('redis:8').start();

      // Inject Redis credentials into the config
      config.redis.host = this.redisContainer.getHost();
      config.redis.port = this.redisContainer.getMappedPort(6379);
    }

    // Start Dex container for OIDC tests
    // Create a temporary dex.yaml with dynamic port values
    const dexTemplatePath = path.join(__dirname, 'dex.yaml');
    const dexTemplate = fs.readFileSync(dexTemplatePath, 'utf-8');
    
    // We'll use localhost and let testcontainers assign actual port later
    // For now, use port 5556 in config (Dex's internal port)
    // Then replace redirect URI with the actual app port
    const dexConfig = dexTemplate
      .replace(/redirectURIs:\s*\n\s*- 'http:\/\/localhost:\d+/g, `redirectURIs:\n      - 'http://localhost:${config.port}`);
    
    // Write config to a temporary file
    const dexTempDir = path.join(__dirname, '..', '.dex-temp');
    if (!fs.existsSync(dexTempDir)) {
      fs.mkdirSync(dexTempDir, { recursive: true });
    }
    const dexConfigPath = path.join(dexTempDir, `dex-${Date.now()}.yaml`);
    fs.writeFileSync(dexConfigPath, dexConfig);
    
    this.dexConfigPath = dexConfigPath;
    
    this.dexContainer = await new GenericContainer('dexidp/dex:v2.45.0')
      .withExposedPorts(5556)
      .withBindMounts([
        {
          source: dexConfigPath,
          target: '/etc/dex/config.yaml',
          mode: 'ro',
        },
      ])
      .withCommand(['dex', 'serve', '/etc/dex/config.yaml'])
      .withStartupTimeout(60000)
      .start();

    const dexHost = this.dexContainer.getHost();
    const dexMappedPort = this.dexContainer.getMappedPort(5556);
    this.dexUrl = `http://${dexHost}:${dexMappedPort}`;

    // Allow nock to let through requests to Dex (localhost)
    nock.enableNetConnect('localhost');
    
    // Activate nock to intercept HTTP requests
    nock.activate();
  }

  static async beforeEach() {
    jest.clearAllMocks();
    nock.cleanAll();

    // Setup HTTP request interception
    nock('http://sign-tool').get('/test/ping').reply(200, 'PONG');
  }

  static async afterAll() {
    nock.restore();
    await Promise.all([this.pgContainer?.stop(), this.redisContainer?.stop(), this.dexContainer?.stop()]);
    
    // Clean up temporary Dex config file
    if (this.dexConfigPath && fs.existsSync(this.dexConfigPath)) {
      fs.unlinkSync(this.dexConfigPath);
    }
  }

  request() {
    const address = `http://localhost:${config.port}`;
    return supertest(address);
  }

  async destroy() {
    await this.stop();

    // Reset the singleton instances to ensure a clean state for each test
    delete (Models as any).singleton;
    delete (Services as any).singleton;
    delete (AuthMiddleware as any).singleton;
  }
}
