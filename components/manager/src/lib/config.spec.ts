import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadManagerConfig } from './config';

const ENV_KEYS = ['CONFIG_PATH', 'SECRET_PATH', 'LIQUIO_CONFIG_PREFIX', 'LIQUIO_CFG_MANAGER_cache', 'FOO_cache', 'LIQUIO_CFG_MANAGER_db'];

function writeJson(dir: string, name: string, value: unknown) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
}

describe('loadManagerConfig', () => {
  let tmp: string;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-config-'));
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('applies the default LIQUIO_CFG_MANAGER_ prefix', () => {
    writeJson(tmp, 'cache.json', { reloadBpmnSchemasInterval: 1 });
    process.env.CONFIG_PATH = tmp;
    process.env.LIQUIO_CFG_MANAGER_cache = '{"reloadBpmnSchemasInterval":2}';

    expect(loadManagerConfig().cache.reloadBpmnSchemasInterval).toBe(2);
  });

  it('uses LIQUIO_CONFIG_PREFIX instead of the default prefix', () => {
    writeJson(tmp, 'cache.json', { reloadBpmnSchemasInterval: 1 });
    process.env.CONFIG_PATH = tmp;
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_cache = '{"reloadBpmnSchemasInterval":3}';
    process.env.LIQUIO_CFG_MANAGER_cache = '{"reloadBpmnSchemasInterval":2}';

    expect(loadManagerConfig().cache.reloadBpmnSchemasInterval).toBe(3);
  });

  it('prefers CONFIG_PATH over the default config path', () => {
    writeJson(tmp, 'cache.json', { reloadBpmnSchemasInterval: 7 });
    process.env.CONFIG_PATH = tmp;

    expect(loadManagerConfig().cache).toEqual({ reloadBpmnSchemasInterval: 7 });
  });

  it('merges the SECRET_PATH directory over the config', () => {
    const secret = path.join(tmp, 'secret');
    writeJson(path.join(tmp, 'conf'), 'cache.json', { reloadBpmnSchemasInterval: 1, a: 1 });
    writeJson(secret, 'cache.json', { a: 2 });
    process.env.CONFIG_PATH = path.join(tmp, 'conf');
    process.env.SECRET_PATH = secret;

    expect(loadManagerConfig().cache).toEqual({ reloadBpmnSchemasInterval: 1, a: 2 });
  });

  it('ignores a missing SECRET_PATH directory', () => {
    writeJson(tmp, 'cache.json', { reloadBpmnSchemasInterval: 1 });
    process.env.CONFIG_PATH = tmp;
    process.env.SECRET_PATH = path.join(tmp, 'absent');

    expect(loadManagerConfig().cache).toEqual({ reloadBpmnSchemasInterval: 1 });
  });
});

describe('migrations-config.js', () => {
  it('exports the db section', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-migrations-'));
    const saved = { c: process.env.CONFIG_PATH, d: process.env.LIQUIO_CFG_MANAGER_db };
    try {
      writeJson(tmp, 'db.json', { database: 'file', host: 'h' });
      process.env.CONFIG_PATH = tmp;
      process.env.LIQUIO_CFG_MANAGER_db = '{"database":"x"}';

      let result: unknown;
      jest.isolateModules(() => {
        result = require('../../migrations-config.js');
      });

      expect(result).toEqual({ database: 'x' });
    } finally {
      if (saved.c === undefined) delete process.env.CONFIG_PATH;
      else process.env.CONFIG_PATH = saved.c;
      if (saved.d === undefined) delete process.env.LIQUIO_CFG_MANAGER_db;
      else process.env.LIQUIO_CFG_MANAGER_db = saved.d;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
