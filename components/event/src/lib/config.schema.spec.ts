import * as path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { eventConfigSchema } from './config.schema';

const TEMPLATES = path.resolve(__dirname, '../../../../config-templates/event');
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

const minimal = (): Record<string, any> => ({ app: {}, db: {}, log: { console: [] }, message_queue: {} });

const parse = (config: Record<string, any>) => Config.fromObject(config, { schema: eventConfigSchema });

const failure = (config: Record<string, any>): ConfigValidationError => {
  try {
    parse(config);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return error as ConfigValidationError;
  }
  throw new Error('expected a ConfigValidationError');
};

describe('eventConfigSchema', () => {
  it('accepts config-templates/event', () => {
    const raw = Config.load<Record<string, any>>({ configPath: TEMPLATES, secretPath: null }).toObject();
    expect(() => parse(raw)).not.toThrow();
  });

  it('accepts a minimal config (optional sections absent) and keeps unknown keys', () => {
    const config = { ...minimal(), extra: { a: 1 }, app: { unknown: true } };
    const result = parse(config).toObject();
    expect(result.extra).toEqual({ a: 1 });
    expect(result.app.unknown).toBe(true);
  });

  it.each(['app', 'db', 'log', 'message_queue'])('rejects a config without %s', (key) => {
    const config = minimal();
    delete config[key];
    const error = failure(config);
    expect(error.issues.some((issue) => issue.path === key)).toBe(true);
  });

  it('never puts config values into the error message', () => {
    const error = failure({ ...minimal(), app: SENTINEL, log: undefined });
    expect(error.message).not.toContain(SENTINEL);
  });

  it('accepts string values for numeric and boolean settings (environment overrides)', () => {
    const config = {
      ...minimal(),
      app: { enabledRunDaemonMode: 'true' },
      message_queue: { shutdownDrainTimeoutMs: '5000' },
      requester: { registers: { deleteRecordsQueue: { concurrent: '2', interval: '1000' } } },
    };
    expect(() => parse(config)).not.toThrow();
  });
});
