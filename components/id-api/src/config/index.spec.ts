import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV_KEYS = ['CONFIG_PATH', 'SECRET_PATH', 'NODE_ENV', 'LIQUIO_ID_CONFIG', 'LIQUIO_CONFIG_PREFIX', 'LIQUIO_CFG_ID_config', 'FOO_config'];

const SEC = { db: { host: 'h', port: 5432, database: 'd', username: 'u', password: 'p' }, auth_providers: {}, redis: {} };

describe('config loading', () => {
  let tmp: string;
  let saved: Record<string, string | undefined>;

  const write = (dir: string, name: string, data: unknown) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
  };
  const load = () => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require('./index');
    });
    return mod;
  };

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'id-cfg-'));
    write(path.join(tmp, 'cfg'), 'config.json', { default_env: 'localhost', localhost: { ...SEC, port: 1 } });
    process.env.CONFIG_PATH = path.join(tmp, 'cfg');
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('loads from files and caches', () => {
    const { loadConfig } = load();
    const first = loadConfig();
    expect(first.port).toBe(1);
    expect(loadConfig()).toBe(first);
  });

  it('env var overrides config.json', () => {
    process.env.LIQUIO_CFG_ID_config =
      '{"default_env":"localhost","localhost":{"db":{"host":"h","port":1,"database":"d","username":"u","password":"p"},"auth_providers":{},"redis":{},"port":2}}';
    expect(load().loadConfig().port).toBe(2);
  });

  it('LIQUIO_CONFIG_PREFIX has no effect', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_config =
      '{"default_env":"localhost","localhost":{"db":{"host":"h","port":1,"database":"d","username":"u","password":"p"},"auth_providers":{},"redis":{},"port":3}}';
    expect(load().loadConfig().port).toBe(1);
  });

  it('merges SECRET_PATH over config', () => {
    write(path.join(tmp, 'sec'), 'config.json', { localhost: { port: 4 } });
    process.env.SECRET_PATH = path.join(tmp, 'sec');
    expect(load().loadConfig().port).toBe(4);
  });

  it('copies versions from versions.json', () => {
    write(path.join(tmp, 'cfg'), 'versions.json', { versions: { services: [{ name: 'a', minVersion: '1' }] } });
    expect(load().loadConfig().versions).toEqual({ services: [{ name: 'a', minVersion: '1' }] });
  });

  it('rejects an invalid config with ConfigValidationError', () => {
    write(path.join(tmp, 'cfg'), 'config.json', { default_env: 'localhost', localhost: { port: 1 } });
    let error: any;
    try {
      load().loadConfig();
    } catch (e) {
      error = e;
    }
    expect(error?.code).toBe('CONFIG_VALIDATION');
    expect(error.issues.map((i: { path: string }) => i.path)).toContain('db');
  });
});

describe('migrations-config', () => {
  let saved: Record<string, string | undefined>;
  let dir: string;

  beforeEach(() => {
    saved = { CONFIG_PATH: process.env.CONFIG_PATH, NODE_ENV: process.env.NODE_ENV, SECRET_PATH: process.env.SECRET_PATH };
    delete process.env.SECRET_PATH;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'id-mig-'));
    process.env.CONFIG_PATH = dir;
    process.env.NODE_ENV = 'test';
  });
  afterEach(() => {
    Object.entries(saved).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const req = () => {
    let r: any;
    jest.isolateModules(() => {
      r = require('../../migrations-config');
    });
    return r;
  };

  it('returns db section', () => {
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ test: { db: { host: 'h' } } }));
    expect(req()).toEqual({ host: 'h' });
  });

  it('throws when the env section is missing', () => {
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ other: {} }));
    expect(() => req()).toThrow("Config for env [test] is not defined or missing 'db' section.");
  });

  it('throws ConfigValidationError when db is missing', () => {
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ test: {} }));
    expect(() => req()).toThrow(/^Invalid config: db: /);
  });
});
