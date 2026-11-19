import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const validToken = `Basic ${Buffer.from('user:a-long-random-secret-1').toString('base64')}`;

describe('Config', () => {
  const envKeys = [
    'CONFIG_PATH',
    'SECRET_PATH',
    'KITSOFT_PDF_GENERATOR_server',
    'KITSOFT_PDF_GENERATOR_auth',
    'LIQUIO_CFG_PDF_GENERATOR_server',
    'LIQUIO_CONFIG_PREFIX',
  ];
  const saved: Record<string, string | undefined> = {};
  let configDir: string;
  let secretDir: string;

  const load = (): { get: <T>(key: string) => T } => {
    let Config!: { get: <T>(key: string) => T };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Config = require('./config').Config;
    });
    return Config;
  };

  beforeEach(() => {
    for (const key of envKeys) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfgen-config-'));
    secretDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfgen-secret-'));
    fs.writeFileSync(path.join(configDir, 'server.json'), JSON.stringify({ port: 3000 }));
    fs.writeFileSync(path.join(configDir, 'auth.json'), JSON.stringify({ basicAuthTokens: [validToken] }));
    process.env.CONFIG_PATH = configDir;
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.rmSync(secretDir, { recursive: true, force: true });
  });

  it('reads values from config files', () => {
    expect(load().get('server')).toEqual({ port: 3000 });
  });

  it('overrides with KITSOFT_PDF_GENERATOR_ env', () => {
    process.env.KITSOFT_PDF_GENERATOR_server = '{"port":1}';
    expect(load().get('server')).toEqual({ port: 1 });
  });

  it('ignores LIQUIO_CFG_PDF_GENERATOR_ and LIQUIO_CONFIG_PREFIX', () => {
    process.env.LIQUIO_CFG_PDF_GENERATOR_server = '{"port":2}';
    process.env.LIQUIO_CONFIG_PREFIX = 'OTHER';
    process.env.KITSOFT_PDF_GENERATOR_server = '{"port":1}';
    expect(load().get('server')).toEqual({ port: 1 });
  });

  it('re-reads env on every call', () => {
    const Config = load();
    process.env.KITSOFT_PDF_GENERATOR_server = '{"port":1}';
    expect(Config.get('server')).toEqual({ port: 1 });
    process.env.KITSOFT_PDF_GENERATOR_server = '{"port":5}';
    expect(Config.get('server')).toEqual({ port: 5 });
  });

  it('merges SECRET_PATH', () => {
    fs.writeFileSync(path.join(secretDir, 'auth.json'), JSON.stringify({ basicAuthTokens: [validToken], extra: 'x' }));
    process.env.SECRET_PATH = secretDir;
    const Config = load();
    expect(Config.get('auth')).toEqual({ basicAuthTokens: [validToken], extra: 'x' });
    expect(Config.get('server')).toEqual({ port: 3000 });
  });

  it('rejects an invalid config with ConfigValidationError', () => {
    process.env.KITSOFT_PDF_GENERATOR_auth = '{"basicAuthTokens":[]}';
    expect(() => load().get('server')).toThrow(expect.objectContaining({ code: 'CONFIG_VALIDATION' }));
  });
});
