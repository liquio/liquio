import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { adminApiConfigSchema } from './config.schema';
import { loadAdminApiConfig } from './config';

const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';
// The token that used to be committed to config-templates, built here to keep the literal out of the sources.
const OLD_DEFAULT_TOKEN = `Basic ${Buffer.from(['task', 'task'].join(':')).toString('base64')}`;
const RANDOM_TOKEN = `Basic ${Buffer.from('admin-api:Zk3p9QwLm2Xv8Rt').toString('base64')}`;

const TEMPLATES = path.join(__dirname, '../../../../config-templates/admin-api');

const buildConfig = (environment = 'production', overrides: Record<string, any> = {}): Record<string, any> => ({
  server: { environment, token: 'tok', crypto: { password: 'pwd', iv: 'iv' } },
  notifier: { password: 'secret' },
  db: { password: 'dbpass' },
  auth: { jwtSecret: 'jwt', basicAuthToken: 'basic', clientSecret: 'client' },
  sign: { token: 'signtok' },
  task: { token: RANDOM_TOKEN },
  log: { console: { name: 'x' } },
  message_queue: {},
  ...overrides,
});

const validate = (raw: Record<string, any>) => Config.fromObject<any>(raw, { schema: adminApiConfigSchema });

const failure = (raw: Record<string, any>): ConfigValidationError => {
  try {
    validate(raw);
  } catch (e) {
    expect(e).toBeInstanceOf(ConfigValidationError);
    return e as ConfigValidationError;
  }
  throw new Error('expected validation to fail');
};

const paths = (e: ConfigValidationError) => e.issues.map((i) => i.path);

describe('adminApiConfigSchema', () => {
  describe('config-templates', () => {
    const load = () => Config.load<any>({ configPath: TEMPLATES, secretPath: null, envPrefix: 'ADMIN_API_SCHEMA_SPEC_' }).toObject();

    it('passes in dev as shipped', () => {
      const raw = load();
      raw.server.environment = 'dev';
      expect(() => validate(raw)).not.toThrow();
    });

    it('passes outside dev with filled secrets and a random task token', () => {
      const raw = load();
      raw.server = { ...raw.server, environment: 'production', token: 't', crypto: { password: 'p', iv: 'i' } };
      raw.notifier = { ...raw.notifier, password: 'p' };
      raw.db = { ...raw.db, password: 'p' };
      raw.auth = { ...raw.auth, jwtSecret: 'j', basicAuthToken: 'b' };
      raw.task = { ...raw.task, token: RANDOM_TOKEN };
      expect(() => validate(raw)).not.toThrow();
    });
  });

  it('keeps unknown keys at top level and nested', () => {
    const raw = buildConfig('production', { extra: { a: 1 } });
    raw.db.unknown = 'x';
    const config = validate(raw).toObject();
    expect(config.extra).toEqual({ a: 1 });
    expect(config.db.unknown).toBe('x');
  });

  it('accepts numbers as strings and every optional section absent', () => {
    expect(() => validate(buildConfig('production', { register: { port: '8080', timeout: '5' }, redis: { port: '6379' } }))).not.toThrow();
    expect(() => validate(buildConfig())).not.toThrow();
  });

  it.each(['server', 'db', 'log', 'message_queue', 'auth'])('requires %s', (key) => {
    const raw = buildConfig();
    delete raw[key];
    expect(paths(failure(raw))).toContain(key);
  });

  it('requires log.console', () => {
    expect(paths(failure(buildConfig('production', { log: {} })))).toContain('log.console');
  });

  describe('server.token', () => {
    it('rejects an empty token in any environment', () => {
      const raw = buildConfig('dev');
      raw.server.token = '';
      const error = failure(raw);
      expect(error.issues).toContainEqual(expect.objectContaining({ path: 'server.token', message: 'must not be empty' }));
    });
  });

  describe('placeholder secrets outside dev', () => {
    it.each([
      ['notifier.password', (c: any) => (c.notifier.password = '<REDACTED>')],
      ['server.token', (c: any) => delete c.server.token],
      ['server.crypto.password', (c: any) => (c.server.crypto.password = '  ')],
      ['server.crypto.iv', (c: any) => (c.server.crypto.iv = null)],
      ['db.password', (c: any) => (c.db.password = '')],
      ['auth.jwtSecret', (c: any) => (c.auth.jwtSecret = ' <REDACTED> ')],
      ['auth.basicAuthToken', (c: any) => delete c.auth.basicAuthToken],
    ])('rejects %s', (p, mutate) => {
      const raw = buildConfig('stage');
      mutate(raw);
      const error = failure(raw);
      expect(error.issues).toContainEqual(
        expect.objectContaining({ path: p, message: 'must be set (not empty or "<REDACTED>") outside of "dev" environment' }),
      );
    });

    it('rejects an unset environment', () => {
      const raw = buildConfig();
      delete raw.server.environment;
      raw.db.password = '<REDACTED>';
      expect(paths(failure(raw))).toContain('db.password');
    });

    it('tolerates them in dev', () => {
      const raw = buildConfig('dev', { notifier: { password: '<REDACTED>' }, db: { password: '' } });
      delete raw.task;
      expect(() => validate(raw)).not.toThrow();
    });

    it('does not fail for auth.clientSecret and sign.token placeholders', () => {
      const raw = buildConfig();
      raw.auth.clientSecret = '<REDACTED>';
      raw.sign.token = '<REDACTED>';
      expect(() => validate(raw)).not.toThrow();
    });
  });

  describe('db.slave.password', () => {
    it.each(['<REDACTED>', '', '  ', undefined])('is required outside dev when db.slave is set (%p)', (password) => {
      const raw = buildConfig();
      raw.db.slave = { host: 'replica', password };
      expect(paths(failure(raw))).toContain('db.slave.password');
    });

    it('passes with a real slave password, without db.slave, and in dev', () => {
      const withSlave = buildConfig();
      withSlave.db.slave = { host: 'replica', password: 'real' };
      expect(() => validate(withSlave)).not.toThrow();
      const nullSlave = buildConfig();
      nullSlave.db.slave = null;
      expect(() => validate(nullSlave)).not.toThrow();
      const dev = buildConfig('dev');
      dev.db.slave = { password: '<REDACTED>' };
      expect(() => validate(dev)).not.toThrow();
    });
  });

  describe('task.token', () => {
    it('rejects the known default token in every environment, with or without the prefix', () => {
      for (const environment of ['dev', 'production']) {
        for (const token of [OLD_DEFAULT_TOKEN, OLD_DEFAULT_TOKEN.slice(6)]) {
          const error = failure(buildConfig(environment, { task: { token } }));
          expect(error.issues).toContainEqual(
            expect.objectContaining({ path: 'task.token', message: 'is a publicly known default token from the repository, rotate it.' }),
          );
        }
      }
    });

    it('requires a token outside dev only', () => {
      const missing = buildConfig();
      delete missing.task;
      expect(failure(missing).issues).toContainEqual(
        expect.objectContaining({ path: 'task.token', message: 'must be set outside of "dev" environment' }),
      );
      expect(paths(failure(buildConfig('production', { task: { token: '' } })))).toContain('task.token');
      expect(() => validate(buildConfig('dev', { task: { token: '' } }))).not.toThrow();
    });
  });

  it('never puts config values in error messages', () => {
    const raw = buildConfig('stage', { task: { token: SENTINEL }, db: { password: SENTINEL, slave: { password: '' } } });
    raw.server.token = '';
    raw.auth.jwtSecret = SENTINEL.slice(0, 10);
    raw.log = SENTINEL;
    const error = failure(raw);
    expect(error.message).not.toContain(SENTINEL);
    expect(error.message).not.toContain(SENTINEL.slice(0, 10));
    expect(JSON.stringify(error.issues)).not.toContain(SENTINEL);
  });
});

describe('loadAdminApiConfig schema wiring', () => {
  let tmp: string;
  const saved = { CONFIG_PATH: process.env.CONFIG_PATH, SECRET_PATH: process.env.SECRET_PATH };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-api-schema-'));
    process.env.CONFIG_PATH = tmp;
    delete process.env.SECRET_PATH;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('rejects a config with an empty server token', () => {
    fs.writeFileSync(path.join(tmp, 'server.json'), JSON.stringify({ token: '', environment: 'dev' }));
    fs.writeFileSync(path.join(tmp, 'db.json'), '{}');
    fs.writeFileSync(path.join(tmp, 'log.json'), JSON.stringify({ console: {} }));
    fs.writeFileSync(path.join(tmp, 'message_queue.json'), '{}');
    fs.writeFileSync(path.join(tmp, 'auth.json'), '{}');
    expect(() => loadAdminApiConfig()).toThrow(ConfigValidationError);
    try {
      loadAdminApiConfig();
    } catch (e) {
      expect((e as ConfigValidationError).issues.map((i) => i.path)).toContain('server.token');
    }
  });
});
