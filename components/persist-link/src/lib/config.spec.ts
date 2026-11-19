import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadPersistLinkConfig } from './config';

const BASE_DB = '{"database":"base"}';
const BASE_SERVER = '{"port":3000}';

const MIGRATIONS_CONFIG = path.resolve(__dirname, '../../migrations-config.js');
const ENV_KEYS = ['LIQUIO_CONFIG_PREFIX', 'CONFIG_PATH', 'SECRET_PATH'];

function loadMigrations(): any {
  let result: any;
  jest.isolateModules(() => {
    result = require(MIGRATIONS_CONFIG);
  });
  return result;
}

describe('persist-link config loading', () => {
  const saved = { ...process.env };
  let tmp: string;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('LIQUIO_CFG_PERSIST_LINK') || key.startsWith('FOO_') || ENV_KEYS.includes(key)) delete process.env[key];
    }
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-config-'));
    process.env.CONFIG_PATH = tmp;
    process.env.LIQUIO_CFG_PERSIST_LINK_server = BASE_SERVER;
  });

  afterEach(() => {
    process.env = { ...saved };
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('loadPersistLinkConfig', () => {
    it('reads default prefix env', () => {
      process.env.LIQUIO_CFG_PERSIST_LINK_db = BASE_DB;
      process.env.LIQUIO_CFG_PERSIST_LINK_log = '{"level":"debug"}';
      expect(loadPersistLinkConfig().log).toEqual({ level: 'debug' });
    });

    it('honours LIQUIO_CONFIG_PREFIX', () => {
      process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
      process.env.FOO_db = BASE_DB;
      process.env.FOO_server = BASE_SERVER;
      process.env.FOO_log = '{"level":"warn"}';
      process.env.LIQUIO_CFG_PERSIST_LINK_db = BASE_DB;
      process.env.LIQUIO_CFG_PERSIST_LINK_log = '{"level":"debug"}';
      expect(loadPersistLinkConfig().log).toEqual({ level: 'warn' });
    });

    it('reads CONFIG_PATH files', () => {
      fs.writeFileSync(path.join(tmp, 'db.json'), JSON.stringify({ database: 'file' }));
      expect(loadPersistLinkConfig().db).toEqual({ database: 'file' });
    });

    it('throws ConfigValidationError when db is missing', () => {
      let error: any;
      try {
        loadPersistLinkConfig();
      } catch (e) {
        error = e;
      }
      expect(error?.code).toBe('CONFIG_VALIDATION');
      expect(error.issues.map((i: { path: string }) => i.path)).toContain('db');
    });

    it('merges SECRET_PATH', () => {
      const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-secret-'));
      try {
        fs.writeFileSync(path.join(tmp, 'db.json'), JSON.stringify({ database: 'file' }));
        fs.writeFileSync(path.join(secretDir, 'db.json'), JSON.stringify({ password: 'p' }));
        process.env.SECRET_PATH = secretDir;
        expect(loadPersistLinkConfig().db).toEqual({ database: 'file', password: 'p' });
      } finally {
        fs.rmSync(secretDir, { recursive: true, force: true });
      }
    });
  });

  describe('migrations-config', () => {
    it('throws ConfigValidationError when db is missing', () => {
      let error: any;
      try {
        loadMigrations();
      } catch (e) {
        error = e;
      }
      expect(error?.code).toBe('CONFIG_VALIDATION');
      expect(error.issues.map((i: { path: string }) => i.path)).toContain('db');
    });

    it('uses the new prefix', () => {
      process.env.LIQUIO_CFG_PERSIST_LINK_db = '{"database":"new"}';
      expect(loadMigrations().database).toBe('new');
    });

    it('accepts the legacy prefix', () => {
      process.env.LIQUIO_CFG_PERSIST_LINK__db = '{"database":"old"}';
      expect(loadMigrations().database).toBe('old');
    });

    it('prefers the new prefix over the legacy one', () => {
      process.env.LIQUIO_CFG_PERSIST_LINK_db = '{"database":"new"}';
      process.env.LIQUIO_CFG_PERSIST_LINK__db = '{"database":"old"}';
      expect(loadMigrations().database).toBe('new');
    });

    it('honours LIQUIO_CONFIG_PREFIX', () => {
      process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
      process.env.FOO_db = '{"database":"foo"}';
      expect(loadMigrations().database).toBe('foo');
    });
  });
});
