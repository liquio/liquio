import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('config', () => {
  const envBackup = { ...process.env };
  let tmp: string;
  let cfgDir: string;

  const loadConfig = () => {
    let mod: typeof import('./config');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('./config');
    });
    return mod!;
  };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.CONFIG_PATH;
    delete process.env.SECRET_PATH;
    delete process.env.LIQUIO_CONFIG_PREFIX;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'register-config-'));
    cfgDir = path.join(tmp, 'cfg');
    fs.mkdirSync(cfgDir);
    fs.writeFileSync(path.join(cfgDir, 'server.json'), JSON.stringify({ port: 1111 }));
    fs.writeFileSync(path.join(cfgDir, 'db.json'), JSON.stringify({ host: 'filehost' }));
  });

  afterEach(() => {
    process.env = { ...envBackup };
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reads CONFIG_PATH with typed access and default env prefix', () => {
    process.env.CONFIG_PATH = cfgDir;
    process.env.LIQUIO_CFG_REGISTER_server = '{"port":2222}';
    const { config } = loadConfig();
    expect(Number(config.server.port)).toBe(2222);
  });

  it('honors LIQUIO_CONFIG_PREFIX override', () => {
    process.env.CONFIG_PATH = cfgDir;
    process.env.LIQUIO_CONFIG_PREFIX = 'CUSTOM_REG';
    process.env.CUSTOM_REG_server = '{"port":3333}';
    process.env.LIQUIO_CFG_REGISTER_server = '{"port":4444}';
    const { config } = loadConfig();
    expect(Number(config.server.port)).toBe(3333);
  });

  it('merges SECRET_PATH and ignores a missing one', () => {
    const secretDir = path.join(tmp, 'secret');
    fs.mkdirSync(secretDir);
    fs.writeFileSync(path.join(secretDir, 'db.json'), JSON.stringify({ host: 'secrethost' }));
    process.env.CONFIG_PATH = cfgDir;
    process.env.SECRET_PATH = secretDir;
    expect(loadConfig().config.db.host).toBe('secrethost');

    process.env.SECRET_PATH = path.join(tmp, 'missing');
    expect(loadConfig().config.db.host).toBe('filehost');
  });

  it('migrations config returns db section with env override', () => {
    process.env.CONFIG_PATH = cfgDir;
    process.env.LIQUIO_CFG_REGISTER_db = '{"host":"envhost"}';
    let db: { host: string };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      db = require('../../migrations-config.js');
    });
    expect(db!.host).toBe('envhost');
  });
});
