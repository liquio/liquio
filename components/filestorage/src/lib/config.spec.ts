import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('lib/config', () => {
  const envBackup = { ...process.env };
  let dir: string;
  let secretDir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-cfg-'));
    secretDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-sec-'));
    fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify({ host: 'base-host', port: 5432 }));
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ processTitle: 'base' }));
    for (const name of ['admin', 'log', 'providers', 'server']) {
      fs.writeFileSync(path.join(dir, `${name}.json`), '{}');
    }
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ tokens: [`Basic ${Buffer.from('user:pass-1').toString('base64')}`] }));
    delete process.env.LIQUIO_CONFIG_PREFIX;
    delete process.env.SECRET_PATH;
    process.env.CONFIG_PATH = dir;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(secretDir, { recursive: true, force: true });
  });

  const load = (): any => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require('./config');
    });
    return mod;
  };

  it('loads config from CONFIG_PATH', () => {
    expect(load().initialize().db.host).toBe('base-host');
  });

  it('applies env override with default prefix', () => {
    process.env.LIQUIO_CFG_FILESTORAGE_db = JSON.stringify({ host: 'env-host' });
    expect(load().initialize().db.host).toBe('env-host');
  });

  it('honours LIQUIO_CONFIG_PREFIX', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'CUSTOM_PFX';
    process.env.CUSTOM_PFX_db = JSON.stringify({ host: 'custom-host' });
    process.env.LIQUIO_CFG_FILESTORAGE_db = JSON.stringify({ host: 'ignored' });
    expect(load().initialize().db.host).toBe('custom-host');
  });

  it('merges SECRET_PATH', () => {
    fs.writeFileSync(path.join(secretDir, 'db.json'), JSON.stringify({ password: 'secret-value' }));
    process.env.SECRET_PATH = secretDir;
    const db = load().initialize().db;
    expect(db.password).toBe('secret-value');
    expect(db.host).toBe('base-host');
  });

  it('returns the same object on repeated initialize()', () => {
    const mod = load();
    expect(mod.initialize()).toBe(mod.initialize());
    expect(mod.getConfig()).toBe(mod.initialize());
  });

  it('initialize() rejects an invalid config', () => {
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ tokens: [] }));
    expect(() => load().initialize()).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
  });

  it('getConfig() throws before initialize()', () => {
    expect(() => load().getConfig()).toThrow('Configuration not initialized. Call initialize() first.');
  });

  it('migrations-config returns db section with env override', () => {
    process.env.LIQUIO_CFG_FILESTORAGE_db = JSON.stringify({ host: 'mig-host' });
    let db: any;
    jest.isolateModules(() => {
      db = require('../../migrations-config.js');
    });
    expect(db.host).toBe('mig-host');
  });
});
