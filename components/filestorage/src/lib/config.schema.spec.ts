import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { COMPROMISED_TOKEN_HASHES, filestorageConfigSchema } from './config.schema';

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => basic(`filestorage:${crypto.randomBytes(24).toString('hex')}`);
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

const TEMPLATE_PATH = path.resolve(__dirname, '../../../../config-templates/filestorage');

const validConfig = (): Record<string, any> => ({
  admin: {},
  app: { processTitle: 'filestorage' },
  auth: { tokens: [randomToken()] },
  db: {},
  log: {},
  providers: {},
  server: {},
});

const load = (raw: Record<string, any>) => Config.fromObject<any>(raw, { schema: filestorageConfigSchema });

const issuesOf = (raw: Record<string, any>) => {
  try {
    load(raw);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return (error as ConfigValidationError).issues;
  }
  throw new Error('expected ConfigValidationError');
};

describe('filestorageConfigSchema', () => {
  it('accepts the shipped template with a generated token', () => {
    const raw = Config.load<any>({ configPath: TEMPLATE_PATH, secretPath: null }).toObject();
    raw.auth = { ...raw.auth, tokens: [randomToken()] };
    expect(() => load(raw)).not.toThrow();
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw: Record<string, any> = { ...validConfig(), extra: { a: 1 } };
    raw.server = { extraNested: true };
    const result = load(raw).toObject();
    expect(result.extra).toEqual({ a: 1 });
    expect(result.server.extraNested).toBe(true);
  });

  it.each(['admin', 'app', 'auth', 'db', 'log', 'providers', 'server'])('requires %s', (key) => {
    const raw = validConfig();
    delete raw[key];
    expect(issuesOf(raw).some((issue) => issue.path === key || issue.path.startsWith(`${key}.`))).toBe(true);
  });

  it('requires app.processTitle', () => {
    const raw = validConfig();
    raw.app = {};
    expect(issuesOf(raw).map((issue) => issue.path)).toContain('app.processTitle');
  });

  it('accepts a generated token', () => {
    expect(() => load(validConfig())).not.toThrow();
  });

  it('rejects missing, empty and non-array tokens', () => {
    for (const auth of [{}, { tokens: [] }, { tokens: 'Basic abc' }]) {
      const issues = issuesOf({ ...validConfig(), auth });
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('auth.tokens');
      expect(issues[0].message).toMatch(/is empty/);
    }
  });

  it('rejects non-string tokens', () => {
    const issues = issuesOf({ ...validConfig(), auth: { tokens: [42, null] } });
    expect(issues.map((issue) => issue.path)).toEqual(['auth.tokens.0', 'auth.tokens.1']);
    expect(issues.every((issue) => /is not a string/.test(issue.message))).toBe(true);
  });

  it('rejects malformed tokens', () => {
    const tokens = ['Bearer abc', 'Basic', 'Basic a b', basic('no-password'), basic(':pass'), basic('user:'), basic('a:b:c')];
    expect(issuesOf({ ...validConfig(), auth: { tokens } })).toHaveLength(tokens.length);
  });

  it('reports the index of the bad token only', () => {
    const issues = issuesOf({ ...validConfig(), auth: { tokens: [basic('client:s3cret'), 'garbage'] } });
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('auth.tokens.1');
  });

  it('rejects the previously shipped tokens', () => {
    const shipped = [
      'Basic dGVzdDE6dGVzdA==',
      'Basic dGVzdDI6RWlUMndlZTRhb0hlZWg1ZW4zZUJhZTFpZWJhaHI1bnV2MWJhZWNoZWlob294NGFlbTVhaXM5dWQ0YWV3YWhuaQ==',
    ];
    for (const token of shipped) {
      expect(COMPROMISED_TOKEN_HASHES).toContain(sha256(token));
    }
    const issues = issuesOf({ ...validConfig(), auth: { tokens: shipped } });
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toMatch(/publicly known/);
  });

  it('formats an extra part as a format error', () => {
    const issues = issuesOf({ ...validConfig(), auth: { tokens: [`${basic('client:s3cret')} extra`] } });
    expect(issues[0].message).toMatch(/"Basic <base64\(user:password\)>" format/);
  });

  it('never leaks token values in the error message', () => {
    const raw = { ...validConfig(), auth: { tokens: [`${SENTINEL} extra`, SENTINEL.replace('Basic ', 'Bearer ')] } };
    try {
      load(raw);
      throw new Error('expected ConfigValidationError');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(SENTINEL);
      expect(message).not.toContain('c2VudGluZWw6c2VudGluZWwtc2VjcmV0');
    }
  });
});

describe('migrations-config.js schema', () => {
  const envBackup = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-mig-'));
    delete process.env.LIQUIO_CONFIG_PREFIX;
    delete process.env.SECRET_PATH;
    process.env.CONFIG_PATH = dir;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const requireMigrations = (): any => {
    let db: any;
    jest.isolateModules(() => {
      db = require('../../migrations-config.js');
    });
    return db;
  };

  it('rejects a config without db', () => {
    try {
      requireMigrations();
      throw new Error('expected ConfigValidationError');
    } catch (error) {
      expect((error as any).code).toBe('CONFIG_VALIDATION');
      expect((error as ConfigValidationError).issues.map((issue) => issue.path)).toContain('db');
    }
  });

  it('returns db when present', () => {
    fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify({ host: 'h' }));
    expect(requireMigrations().host).toBe('h');
  });
});
