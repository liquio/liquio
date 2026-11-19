import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('config', () => {
  const saved = { ...process.env };
  let dir: string;

  const write = (cfg: any) => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notification-config-'));
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
    process.env.CONFIG_PATH = dir;
  };
  const load = (): any => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require('./config');
    });
    return mod;
  };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SECRET_PATH;
    delete process.env.LIQUIO_CONFIG_PREFIX;
    delete process.env.LIQUIO_CFG_NOTIFICATION_config;
  });

  afterEach(() => {
    process.env = { ...saved };
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('picks config[NODE_ENV]', () => {
    write({ default_env: 'a', a: { db: { n: 'a' } }, b: { db: { n: 'b' } } });
    process.env.NODE_ENV = 'b';
    const m = load();
    expect(m.env).toBe('b');
    expect(m.conf.db.n).toBe('b');
  });

  it('falls back to default_env when NODE_ENV is unset', () => {
    write({ default_env: 'a', a: { db: { n: 'a' } }, b: { db: { n: 'b' } } });
    expect(load().conf.db.n).toBe('a');
  });

  it('is overridden by the env variable', () => {
    write({ default_env: 'a', a: { db: { n: 'a' } } });
    process.env.LIQUIO_CFG_NOTIFICATION_config = '{"default_env":"x","x":{"db":{}}}';
    const m = load();
    expect(m.env).toBe('x');
    expect(m.conf.db).toEqual({});
  });

  it('throws when the directory is missing', () => {
    process.env.CONFIG_PATH = path.join(os.tmpdir(), 'notification-config-missing-dir');
    expect(() => load()).toThrow('Config directory does not exist.');
  });

  it('throws when the section has no db', () => {
    write({ default_env: 'a', a: {} });
    expect(() => load()).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
    expect(() => load()).toThrow('a.db: is not defined');
  });

  it('includes versions keys in conf', () => {
    write({ default_env: 'a', a: { db: {} } });
    const versions = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/config/versions.json.default'), 'utf8') || '{}');
    expect(load().conf).toMatchObject(versions);
  });

  it('migrations config rejects a default_env section without db', () => {
    write({ default_env: 'a', a: {} });
    expect(() => {
      jest.isolateModules(() => {
        require('../../migrations-config.js');
      });
    }).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
  });

  it('migrations config returns default_env db regardless of NODE_ENV', () => {
    write({ default_env: 'a', a: { db: { n: 'a' } }, b: { db: { n: 'b' } } });
    process.env.NODE_ENV = 'b';
    let res: any;
    jest.isolateModules(() => {
      res = require('../../migrations-config.js');
    });
    expect(res).toEqual({ n: 'a' });
  });
});
