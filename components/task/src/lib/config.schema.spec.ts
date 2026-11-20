import * as path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { buildTaskConfigSchema } from './config.schema';

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
// The token that used to be committed to config-templates, built here to keep the literal out of the sources.
const OLD_DEFAULT_TOKEN = basic(['task', 'task'].join(':'));
const GOOD_TOKEN = basic('admin-api:Zk3p9QwLm2Xv8Rt');
const GOOD_SECRET = 'Zk3p9QwLm2Xv8RtYh5Nc7Bd1Zk3p9QwL';
const TEMPLATES = path.resolve(__dirname, '../../../../config-templates/task');

const minimal = (): Record<string, any> => ({
  basic_auth: { tokens: [GOOD_TOKEN] },
  download_token: { jwtSecret: GOOD_SECRET },
  log: { console: [] },
  server: { port: 8 },
  db: { host: 'localhost' },
});

const parse = (config: Record<string, any>, env = 'test', override?: string) =>
  Config.fromObject(config, { schema: buildTaskConfigSchema(env, override) });

const failure = (config: Record<string, any>, env = 'test', override?: string): ConfigValidationError => {
  try {
    parse(config, env, override);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return error as ConfigValidationError;
  }
  throw new Error('expected a ConfigValidationError');
};

const issueAt = (error: ConfigValidationError, issuePath: string) => error.issues.find((issue) => issue.path === issuePath);

describe('buildTaskConfigSchema', () => {
  describe('shipped templates and permissiveness', () => {
    it.each(['test', 'production'])('accepts config-templates/task with injected secrets in %s', (env) => {
      const raw = Config.load<Record<string, any>>({ configPath: TEMPLATES, secretPath: null }).toObject();
      const config = {
        ...raw,
        basic_auth: { ...raw.basic_auth, tokens: [GOOD_TOKEN] },
        download_token: { ...raw.download_token, jwtSecret: GOOD_SECRET },
      };
      expect(() => parse(config, env)).not.toThrow();
    });

    it('accepts a minimal config and keeps unknown keys at every level', () => {
      const config = { ...minimal(), extra: { a: 1 }, server: { port: '8', unknown: true } };
      const result = parse(config).toObject();
      expect(result.extra).toEqual({ a: 1 });
      expect(result.server.unknown).toBe(true);
    });

    it('passes with every optional section absent', () => {
      expect(() => parse(minimal())).not.toThrow();
      expect(() => parse(minimal(), 'production')).not.toThrow();
    });
  });

  describe('required keys', () => {
    it.each(['basic_auth', 'log', 'server', 'db'])('fails when %s is missing', (key) => {
      const config = minimal();
      delete config[key];
      expect(issueAt(failure(config), key)).toBeDefined();
    });

    it('fails when log.console is missing', () => {
      const config = { ...minimal(), log: {} };
      expect(issueAt(failure(config), 'log.console')).toBeDefined();
    });
  });

  describe('basic_auth rules', () => {
    it('refuses the old default token, with or without the Basic prefix', () => {
      for (const token of [OLD_DEFAULT_TOKEN, OLD_DEFAULT_TOKEN.slice(6)]) {
        const error = failure({ ...minimal(), basic_auth: { tokens: [token] } });
        expect(issueAt(error, 'basic_auth.tokens.0')?.message).toContain('publicly known default token');
      }
    });

    it('points at the index of the bad token', () => {
      const error = failure({ ...minimal(), basic_auth: { tokens: [basic('a:b1'), OLD_DEFAULT_TOKEN] } });
      expect(error.issues.map((issue) => issue.path)).toEqual(['basic_auth.tokens.1']);
    });

    it('refuses user:user, malformed and non-string tokens', () => {
      expect(issueAt(failure({ ...minimal(), basic_auth: { tokens: [basic('user:user')] } }), 'basic_auth.tokens.0')?.message).toContain(
        'password equal to the user name',
      );
      expect(issueAt(failure({ ...minimal(), basic_auth: { tokens: [basic('nopassword')] } }), 'basic_auth.tokens.0')?.message).toContain(
        '"user:password"',
      );
      expect(issueAt(failure({ ...minimal(), basic_auth: { tokens: [42] } }), 'basic_auth.tokens.0')?.message).toContain('is not a string');
    });

    it('refuses an empty list only in production', () => {
      expect(issueAt(failure({ ...minimal(), basic_auth: { tokens: [] } }, 'production'), 'basic_auth.tokens')?.message).toContain('is empty');
      expect(() => parse({ ...minimal(), basic_auth: { tokens: [] } }, 'jest')).not.toThrow();
    });

    it('refuses a missing or non-array tokens list', () => {
      expect(issueAt(failure({ ...minimal(), basic_auth: {} }), 'basic_auth.tokens')).toBeDefined();
      expect(issueAt(failure({ ...minimal(), basic_auth: { tokens: 'x' } }), 'basic_auth.tokens')?.message).toBe('must be an array');
    });
  });

  describe('download_token.jwtSecret rule', () => {
    it('accepts a random secret', () => {
      expect(() => parse(minimal())).not.toThrow();
    });

    it.each([undefined, '', '<removed>', '<REDACTED>', 'REDACTED', 'changeme', 'short'])('refuses %p', (jwtSecret) => {
      const config = { ...minimal(), download_token: { jwtSecret } };
      const message = issueAt(failure(config), 'download_token.jwtSecret')?.message;
      expect(message).toBeDefined();
      expect(message).not.toMatch(/^download_token\.jwtSecret/);
    });

    it('refuses a missing section', () => {
      const config = minimal();
      delete config.download_token;
      expect(issueAt(failure(config), 'download_token.jwtSecret')?.message).toContain('is empty');
    });
  });

  describe('test auth rules', () => {
    const token = 'test-user-token-0123456789';
    const users = { list: [{ token, user: { userId: '1' } }] };

    it('refuses test auth flags in production without the override', () => {
      const flags = [{ allowedTestAuth: true }, { allowedTestSign: true }, { allowedTestPem: true }];
      for (const auth of flags) {
        const message = issueAt(failure({ ...minimal(), auth, test_users: users }, 'production'), 'auth')?.message;
        expect(message).toContain(`auth.${Object.keys(auth)[0]} enabled in production`);
        expect(message).toContain('ALLOW_TEST_AUTH_IN_PRODUCTION=true');
      }
      expect(issueAt(failure({ ...minimal(), auth: { allowedTestAuth: true } }, 'production'), 'auth')).toBeDefined();
    });

    it('accepts the template defaults in production (allowedTestPem without test users is inert)', () => {
      const auth = { allowedTestAuth: false, allowedTestSign: false, allowedTestPem: true };
      expect(() => parse({ ...minimal(), auth }, 'production')).not.toThrow();
    });

    it('allows production with the explicit override and other environments', () => {
      expect(() => parse({ ...minimal(), auth: { allowedTestAuth: true }, test_users: users }, 'production', 'true')).not.toThrow();
      expect(() => parse({ ...minimal(), auth: { allowedTestAuth: true }, test_users: users }, 'test')).not.toThrow();
    });

    it('refuses short, missing and placeholder test tokens when enabled', () => {
      const bad = (value: any) => ({ ...minimal(), auth: { allowedTestAuth: true }, test_users: { list: [{ token: value }] } });
      expect(issueAt(failure(bad('short')), 'test_users.list.0.token')?.message).toContain('shorter than 16 characters');
      expect(issueAt(failure(bad(undefined)), 'test_users.list.0.token')?.message).toContain('shorter than 16 characters');
      expect(issueAt(failure(bad('<REDACTED-REDACTED>')), 'test_users.list.0.token')?.message).toBe('is a placeholder');
    });

    it('does not check tokens when no flag is enabled', () => {
      expect(() => parse({ ...minimal(), auth: { allowedTestAuth: false }, test_users: { list: [{ token: 'x' }] } }, 'production')).not.toThrow();
    });
  });

  it('never puts a config value in the error message', () => {
    const sentinel = basic('sentinel:sentinel-secret');
    const error = failure({
      ...minimal(),
      basic_auth: { tokens: [OLD_DEFAULT_TOKEN, sentinel, 'Basic c2VudGluZWw6c2VudGluZWw='] },
      download_token: { jwtSecret: sentinel },
      auth: { allowedTestAuth: true },
      test_users: { list: [{ token: sentinel.slice(0, 12) }] },
    });
    expect(error.message).not.toContain(sentinel);
    expect(error.message).not.toContain(OLD_DEFAULT_TOKEN);
    expect(error.message).not.toContain(GOOD_SECRET);
  });
});
