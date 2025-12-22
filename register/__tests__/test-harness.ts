import { exec } from 'child_process';
import { Server } from 'http';
import { createServer } from 'net';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import debug from 'debug';
import moment from 'moment';
import Multiconf from 'multiconf';
import { Sequelize } from 'sequelize';
import supertest from 'supertest';

import { insertData } from './fixtures';

import ExportBusiness from '../src/businesses/export';
import Afterhandler from '../src/lib/afterhandler';
import { Config } from '../src/lib/config';
import Db from '../src/lib/db';
import Encryption from '../src/lib/encryption';
import ErrorWithDetails from '../src/lib/errors';
import Log from '../src/lib/log';
import ConsoleLogProvider from '../src/lib/log/providers/console';
import LogProvider, { LogLevels } from '../src/lib/log/providers/log_provider';
import { RedisClient } from '../src/lib/redis_client';
import typeOf from '../src/lib/typeOf';
import Models from '../src/models';
import Router from '../src/router';

const testDebug = debug('test');

export interface TestHarnessOptions {
  useDatabase?: boolean;
  useRedis?: boolean;
}

export class TestHarness {
  private postgresContainer?: StartedPostgreSqlContainer;
  private redisContainer?: StartedRedisContainer;
  private config: Config;
  private server?: Server;
  private db?: Sequelize;
  private isExternalDb: boolean = false;
  private uniqueDbName?: string;

  constructor() {
    this.config = Multiconf.get('../config-templates/register', 'KITSOFT_REGISTER_');
  }

  getConfig(): Config {
    return this.config;
  }

  async setup(options: TestHarnessOptions = {}) {
    const config = this.config;

    // Use unused ports to allow parallel test execution
    config.server.port = await this.getUnusedPort();

    // Override auth tokens for testing
    if (!config.auth) {
      config.auth = {
        tokens: ['Basic dGVzdDp0ZXN0'], // test:test
        allowRawSequelizeParamsUsers: [],
        limitedAccess: []
      };
    } else {
      config.auth.tokens = ['Basic dGVzdDp0ZXN0']; // test:test
    }

    await this.setupLogger();

    if (options.useDatabase) {
      await this.setupDatabase(config);
    }

    if (options.useRedis) {
      await this.setupRedis(config);
    }

    global.ErrorWithDetails = ErrorWithDetails;
    global.typeOf = typeOf;
    global.moment = moment;
    global.config = config;

    // Init DB.
    const db = (global.db = await Db.getInstance(config.db));
    this.db = db;

    // Init models.
    const models = new Models(config);
    models.init();

    // Init afterhandler.
    const afterhandler = new Afterhandler(config.afterhandler, models.models.afterhandler, models.models.record);
    afterhandler.init();
    global.afterhandler = afterhandler;
    global.encryption = new Encryption(config.encryption);

    // Start server.
    const router = new Router(config);
    const express = await router.init();
    this.server = express;

    return { express, router, db };
  }

  async runMigrations() {
    testDebug('Running migrations...');

    let connectionUri: string;

    if (this.isExternalDb) {
      // Build connection URI for external database
      const { host, port, username, password, database } = this.config.db;
      connectionUri = `postgres://${username}:${password}@${host}:${port}/${database}`;
    } else {
      if (!this.postgresContainer) {
        throw new Error('PostgreSQL container not initialized');
      }
      connectionUri = this.postgresContainer.getConnectionUri();
    }

    return new Promise<void>((resolve, reject) => {
      exec(`npx sequelize db:migrate --url ${connectionUri}`, { env: process.env, encoding: 'utf-8' }, (error, stdout, stderr) => {
        if (error) {
          testDebug('Migration error:', error.message);
          if (stderr) {
            testDebug('Migration stderr:', stderr);
          }
          reject(error);
          return;
        }

        // Log each line separately
        stdout.split('\n').forEach((line) => {
          if (line.trim()) {
            testDebug(line);
          }
        });

        testDebug('Migrations complete');
        resolve();
      });
    });
  }

  async setupFixtures() {
    await this.runMigrations();
    testDebug('Inserting test fixtures...');
    const fixtures = await insertData(this.db);
    testDebug('Fixtures inserted:', Object.keys(fixtures));
    return fixtures;
  }

  request() {
    const hostname = this.config.server.hostname;
    const port = this.config.server.port;
    return supertest(`http://${hostname}:${port}`);
  }

  getDb() {
    return this.db;
  }

  async clearRedisCache(pattern?: string | string[]): Promise<number> {
    const redisClient = RedisClient.getInstance();
    if (!redisClient) {
      return 0;
    }
    if (pattern) {
      return await redisClient.deleteMany(pattern);
    }
    // Clear all cache
    return await redisClient.deleteMany('*');
  }

  async teardown() {
    testDebug('Starting teardown...');

    // Close the main server
    if (this.server) {
      testDebug('Closing main server...');
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err?: Error) => {
          if (err) {
            testDebug('Error closing main server:', err);
            reject(err);
          } else {
            testDebug('Main server closed');
            resolve();
          }
        });
      });
    }

    // Stop and dispose afterhandler workers
    if (global.afterhandler) {
      testDebug('Stopping afterhandler workers...');
      // First stop all workers to exit their processing loops
      await Promise.all(global.afterhandler.workers.map((worker: { stop: () => Promise<void> }) => worker.stop()));
      testDebug('Afterhandler workers stopped');

      // Then dispose of them
      testDebug('Disposing afterhandler workers...');
      global.afterhandler.workers.forEach((worker: { dispose: () => void }) => worker.dispose());
      testDebug('Afterhandler workers disposed');
    }

    // Clear all export timers to prevent Jest from hanging
    testDebug('Clearing export timers...');
    try {
      const exportBusiness = ExportBusiness.singleton;
      if (exportBusiness && exportBusiness.clearAllTimeouts) {
        exportBusiness.clearAllTimeouts();
        testDebug('Export timers cleared');
      }
    } catch (error) {
      testDebug('Error clearing export timers:', error);
    }

    // Close database connection
    if (this.db) {
      testDebug('Closing database connection...');
      await this.db.close();
      testDebug('Database connection closed');
    }

    // Drop unique database if using external database
    if (this.isExternalDb && this.uniqueDbName) {
      testDebug(`Dropping unique database: ${this.uniqueDbName}`);
      const tempSequelize = new Sequelize({
        host: this.config.db.host,
        port: this.config.db.port,
        username: this.config.db.username,
        password: this.config.db.password,
        database: process.env.DB_NAME || 'postgres',
        dialect: 'postgres',
        logging: false
      });

      try {
        // Force disconnect any active connections to the database
        await tempSequelize.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = '${this.uniqueDbName}'
          AND pid <> pg_backend_pid()
        `);
        await tempSequelize.query(`DROP DATABASE IF EXISTS ${this.uniqueDbName}`);
        testDebug(`Dropped unique database: ${this.uniqueDbName}`);
      } catch (error) {
        testDebug('Error dropping database:', error.message);
      } finally {
        await tempSequelize.close();
      }
    }

    // Close Redis client
    if (RedisClient.getInstance()) {
      testDebug('Closing Redis client...');
      try {
        const redisClient = RedisClient.getInstance();
        await redisClient.close();
        testDebug('Redis client closed');
      } catch (err) {
        testDebug('Error closing Redis client:', err);
      }
    }

    // Stop containers
    if (this.postgresContainer) {
      testDebug('Stopping PostgreSQL container...');
      await this.postgresContainer.stop();
      testDebug('PostgreSQL container stopped');
    }

    if (this.redisContainer) {
      testDebug('Stopping Redis container...');
      await this.redisContainer.stop();
      testDebug('Redis container stopped');
    }

    // Clean up global references to allow fresh setup in next test suite
    testDebug('Cleaning up global references...');
    delete (global as any).config;
    delete (global as any).db;
    delete (global as any).afterhandler;
    delete (global as any).encryption;
    delete (global as any).log;
    testDebug('Global references cleaned up');

    testDebug('Teardown complete');
  }

  private async setupLogger() {
    const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: [] });
    const log = new Log([consoleLogProvider as LogProvider]);

    (log as { save: (type: string, data: unknown, level: LogLevels) => void }).save = (type: string, data: unknown = true, level: LogLevels) => {
      testDebug(level, type, data);
    };

    global.log = log;
  }

  private async setupDatabase(config: Config): Promise<StartedPostgreSqlContainer | undefined> {
    const isExternalDb = !!process.env.DB_HOST;
    this.isExternalDb = isExternalDb;

    // Generate unique database name for parallel test execution
    const uniqueDbName = `test_db_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.uniqueDbName = uniqueDbName;

    if (isExternalDb) {
      // Use external database (e.g., in GitLab CI)
      testDebug('Using external PostgreSQL database...');

      config.db.host = process.env.DB_HOST!;
      config.db.username = process.env.DB_USER || 'test_user';
      config.db.password = process.env.DB_PASSWORD || 'test_password';
      config.db.port = parseInt(process.env.DB_PORT || '5432', 10);
      config.db.database = process.env.DB_NAME || 'postgres';

      // Create a unique database for this test run
      const tempSequelize = new Sequelize({
        host: config.db.host,
        port: config.db.port,
        username: config.db.username,
        password: config.db.password,
        database: config.db.database,
        dialect: 'postgres',
        logging: false
      });

      try {
        await tempSequelize.query(`CREATE DATABASE ${uniqueDbName}`);
        testDebug(`Created unique database: ${uniqueDbName}`);
      } catch (error) {
        testDebug('Error creating database:', error.message);
        throw error;
      } finally {
        await tempSequelize.close();
      }

      // Update config to use the unique database
      config.db.database = uniqueDbName;

      testDebug(`Using external PostgreSQL on ${config.db.host}:${config.db.port}, database: ${uniqueDbName}`);
      return undefined;
    } else {
      // Use testcontainers
      if (this.postgresContainer) {
        return this.postgresContainer;
      }

      testDebug('Starting PostgreSQL container...');
      this.postgresContainer = await new PostgreSqlContainer('postgres:17-alpine')
        .withDatabase(uniqueDbName)
        .withUsername('test_user')
        .withPassword('test_password')
        .start();

      config.db.database = uniqueDbName;
      config.db.username = 'test_user';
      config.db.password = 'test_password';
      config.db.host = this.postgresContainer.getHost();
      config.db.port = this.postgresContainer.getPort();

      testDebug(`PostgreSQL container started on port: ${this.postgresContainer.getPort()}, database: ${uniqueDbName}`);
      return this.postgresContainer;
    }
  }

  private async setupRedis(config: Config) {
    const isExternalRedis = !!process.env.REDIS_HOST;

    if (isExternalRedis) {
      // Use external Redis (e.g., in GitLab CI)
      testDebug('Using external Redis...');

      config.redis = {
        isEnabled: true,
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        defaultTtl: 3600
      };

      const redisClient = new RedisClient({
        host: config.redis.host,
        port: config.redis.port
      });

      // Connect to Redis
      await redisClient.connect();

      testDebug(`Using external Redis on ${config.redis.host}:${config.redis.port}`);
      return undefined;
    } else {
      // Use testcontainers
      if (this.redisContainer) {
        return this.redisContainer;
      }

      testDebug('Starting Redis container...');
      this.redisContainer = await new RedisContainer('redis:7-alpine').withExposedPorts(6379).start();

      config.redis = {
        isEnabled: true,
        host: this.redisContainer.getHost(),
        port: this.redisContainer.getPort(),
        defaultTtl: 3600
      };

      const redisClient = new RedisClient({
        host: config.redis.host,
        port: config.redis.port
      });

      // Connect to Redis
      await redisClient.connect();

      testDebug(`Redis container started on port: ${this.redisContainer.getPort()}`);
      return this.redisContainer;
    }
  }

  private async getUnusedPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.unref();
      server.on('error', reject);
      server.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' && address !== null ? address.port : 0;
        server.close(() => resolve(port));
      });
    });
  }
}
