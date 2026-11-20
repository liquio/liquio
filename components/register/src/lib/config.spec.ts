import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('config', () => {
  const envBackup = { ...process.env };
  let tmp: string;
  let cfgDir: string;

  const serverJson = (port: number) => JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(cfgDir, 'server.json'), 'utf8')), port });

  const loadConfig = () => {
    let mod: typeof import('./config');
    jest.isolateModules(() => {
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
    fs.cpSync(path.resolve(__dirname, '../../../../config-templates/register'), cfgDir, { recursive: true });
    fs.writeFileSync(path.join(cfgDir, 'auth.json'), JSON.stringify({ tokens: ['Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA=='], limitedAccess: [] }));
    fs.writeFileSync(
      path.join(cfgDir, 'server.json'),
      JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(cfgDir, 'server.json'), 'utf8')), port: 1111 }),
    );
    fs.writeFileSync(
      path.join(cfgDir, 'db.json'),
      JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(cfgDir, 'db.json'), 'utf8')), host: 'filehost' }),
    );
  });

  afterEach(() => {
    process.env = { ...envBackup };
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reads CONFIG_PATH with typed access and default env prefix', () => {
    process.env.CONFIG_PATH = cfgDir;
    process.env.LIQUIO_CFG_REGISTER_server = serverJson(2222);
    const { config } = loadConfig();
    expect(Number(config.server.port)).toBe(2222);
  });

  it('honors LIQUIO_CONFIG_PREFIX override', () => {
    process.env.CONFIG_PATH = cfgDir;
    process.env.LIQUIO_CONFIG_PREFIX = 'CUSTOM_REG';
    process.env.CUSTOM_REG_server = serverJson(3333);
    process.env.LIQUIO_CFG_REGISTER_server = serverJson(4444);
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
      db = require('../../migrations-config.js');
    });
    expect(db!.host).toBe('envhost');
  });

  it('throws ConfigValidationError for an invalid config at import', () => {
    fs.writeFileSync(path.join(cfgDir, 'auth.json'), JSON.stringify({ tokens: [] }));
    process.env.CONFIG_PATH = cfgDir;
    expect(() => loadConfig()).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
  });

  it('migrations config rejects a missing db section', () => {
    fs.rmSync(path.join(cfgDir, 'db.json'));
    process.env.CONFIG_PATH = cfgDir;
    expect(() => {
      jest.isolateModules(() => {
        require('../../migrations-config.js');
      });
    }).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
  });
});
