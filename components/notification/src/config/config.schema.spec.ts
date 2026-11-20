import path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { buildNotificationConfigSchema } from './config.schema';

const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

// Without an explicit environment the schema reads NODE_ENV, which jest sets to `test`: pass an empty one to fall back to default_env.
const validate = (raw: any, nodeEnv = '') => Config.fromObject<any>(raw, { schema: buildNotificationConfigSchema(nodeEnv) });
const issuesOf = (fn: () => unknown): { path: string; message: string }[] => {
  try {
    fn();
  } catch (e: any) {
    expect(e).toBeInstanceOf(ConfigValidationError);
    return e.issues;
  }
  throw new Error('expected ConfigValidationError');
};

describe('notification config schema', () => {
  it('accepts config-templates/notification in production', () => {
    const configPath = path.join(process.cwd(), '../../config-templates/notification');
    const cfg = Config.load<any>({
      configPath,
      secretPath: null,
      transform: (raw: any) => raw.config,
      schema: buildNotificationConfigSchema('production'),
    });
    expect(cfg.toObject().production.db).toBeDefined();
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const cfg = validate({ default_env: 'a', extra: { x: 1 }, a: { db: {}, unknown: { y: 2 } } }).toObject();
    expect(cfg.extra).toEqual({ x: 1 });
    expect(cfg.a.unknown).toEqual({ y: 2 });
  });

  it('NODE_ENV wins over default_env, then default_env, then test', () => {
    expect(issuesOf(() => validate({ default_env: 'a', a: { db: {} }, b: {} }, 'b'))[0]).toMatchObject({ path: 'b.db' });
    expect(() => validate({ default_env: 'a', a: { db: {} }, b: {} })).not.toThrow();
    expect(() => validate({ test: { db: {} } })).not.toThrow();
  });

  it('reports a missing section and a missing db', () => {
    expect(issuesOf(() => validate({ default_env: 'a' }))[0]).toMatchObject({ path: 'a', message: 'is not defined' });
    expect(issuesOf(() => validate({ default_env: 'a', a: {} }))[0]).toMatchObject({ path: 'a.db', message: 'is not defined' });
  });

  it('reports a non-string default_env', () => {
    expect(issuesOf(() => validate({ default_env: 5 }))[0]).toMatchObject({ path: 'default_env', message: 'must be a string' });
  });

  it('does not validate other environments', () => {
    expect(() => validate({ default_env: 'a', a: { db: {} }, b: 'anything' })).not.toThrow();
  });

  it('never echoes config values', () => {
    try {
      validate({ default_env: 'a', a: { password: SENTINEL, port: { bad: SENTINEL } } });
    } catch (e: any) {
      expect(e.message).not.toContain(SENTINEL);
      return;
    }
    throw new Error('expected ConfigValidationError');
  });
});
