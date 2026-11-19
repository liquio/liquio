import { join } from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { buildConfigurationSchema } from './configuration.schema';
import { ExternalReaderConfig } from './configuration.types';

const LEGACY_DEFAULT = ['user', 'name:pass', 'word'].join('');
const VALID_TOKEN = 'external-reader:Xk29sLq8Zr41Vb7n';
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';
const TEMPLATE_DIR = join(__dirname, '../../../../../config-templates/external-reader');

const validate = (raw: unknown, env: string | undefined = 'test') =>
  Config.fromObject<ExternalReaderConfig>(raw as Record<string, unknown>, { schema: buildConfigurationSchema(env) });

const issuesOf = (raw: unknown, env?: string) => {
  try {
    validate(raw, env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return (error as ConfigValidationError).issues;
  }
  return [];
};

const base = (tokens?: unknown): Record<string, unknown> => ({ server: { port: 3000 }, auth: { basicAuthTokens: tokens } });

describe('buildConfigurationSchema', () => {
  it.each(['production', 'test'])('accepts the shipped template with a valid token in %s', (env) => {
    const raw = Config.load<Record<string, unknown>>({ configPath: TEMPLATE_DIR, secretPath: null }).toObject();
    raw.auth = { basicAuthTokens: [VALID_TOKEN] };
    expect(() => validate(raw, env)).not.toThrow();
  });

  it('keeps unknown keys at the top level and nested', () => {
    const config = validate({ server: { port: '3000', extra: 1 }, other: { a: 1 } }).toObject() as Record<string, any>;
    expect(config.other).toEqual({ a: 1 });
    expect(config.server.extra).toBe(1);
  });

  it('accepts a config with all optional sections absent', () => {
    expect(() => validate({ server: { port: 3000 } }, 'test')).not.toThrow();
  });

  it('requires server and server.port', () => {
    expect(issuesOf({}).map((i) => i.path)).toContain('server');
    expect(issuesOf({ server: {} }).map((i) => i.path)).toContain('server.port');
  });

  it('refuses the legacy shipped default in every environment', () => {
    for (const env of ['production', 'prod', 'development', 'test', undefined]) {
      expect(issuesOf(base([LEGACY_DEFAULT]), env)).toEqual([
        { path: 'auth.basicAuthTokens.0', code: 'custom', message: 'is a publicly known default credential from the repository, rotate it.' },
      ]);
    }
  });

  it('refuses the legacy default listed next to a valid token', () => {
    expect(issuesOf(base([VALID_TOKEN, LEGACY_DEFAULT]), 'test').map((i) => i.path)).toEqual(['auth.basicAuthTokens.1']);
  });

  it('refuses an empty or missing list only in production', () => {
    for (const raw of [base([]), { server: { port: 1 } }]) {
      expect(issuesOf(raw, 'production')).toEqual([
        { path: 'auth.basicAuthTokens', code: 'custom', message: 'is empty: configure at least one "user:password" token.' },
      ]);
      expect(issuesOf(raw, 'development')).toEqual([]);
    }
  });

  it.each([
    [['<REDACTED>'], 'is a placeholder value.'],
    [['external-reader:CHANGEME'], 'is a placeholder value.'],
    [['nocolonhere'], 'must have the form "user:password".'],
    [['external-reader:short'], 'password is shorter than 8 characters.'],
    [[42], 'is empty or not a string.'],
    [['  '], 'is empty or not a string.'],
  ])('production rejects %j', (tokens, message) => {
    expect(issuesOf(base(tokens), 'production')).toEqual([{ path: 'auth.basicAuthTokens.0', code: 'custom', message }]);
  });

  it('does not refuse placeholders outside production', () => {
    expect(issuesOf(base(['<REDACTED>']), 'development')).toEqual([]);
  });

  it('accepts a valid token in production', () => {
    expect(issuesOf(base([VALID_TOKEN]), 'production')).toEqual([]);
  });

  it('never prints token values', () => {
    for (const token of [LEGACY_DEFAULT, SENTINEL, `${SENTINEL}-x`]) {
      try {
        validate(base([token, 'nocolon']), 'production');
      } catch (error) {
        expect((error as Error).message).not.toContain(token);
      }
    }
  });
});
