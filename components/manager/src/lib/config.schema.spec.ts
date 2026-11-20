import path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { managerConfigSchema } from './config.schema';

const TEMPLATE_DIR = path.resolve(__dirname, '../../../../config-templates/manager');
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

function minimal(): Record<string, any> {
  return {
    cache: { reloadBpmnSchemasInterval: 1 },
    db: { database: 'x' },
    log: { console: {} },
    message_queue: { provider: 'rabbitmq' },
  };
}

function validationError(raw: unknown): ConfigValidationError {
  try {
    Config.fromObject(raw as any, { schema: managerConfigSchema });
  } catch (error) {
    return error as ConfigValidationError;
  }
  throw new Error('expected validation to fail');
}

describe('managerConfigSchema', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('accepts the config template', () => {
    delete process.env.CONFIG_PATH;
    delete process.env.SECRET_PATH;
    expect(() =>
      Config.load({ configPath: TEMPLATE_DIR, secretPath: null, envPrefix: 'NO_SUCH_PREFIX_', schema: managerConfigSchema }),
    ).not.toThrow();
  });

  it('keeps unknown keys at every level', () => {
    const raw: Record<string, any> = { ...minimal(), extra: { a: 1 } };
    raw.cache.other = true;
    const obj = Config.fromObject<any>(raw, { schema: managerConfigSchema }).toObject();

    expect(obj.extra).toEqual({ a: 1 });
    expect(obj.cache.other).toBe(true);
  });

  it('passes when optional sections are absent', () => {
    expect(() => Config.fromObject(minimal() as any, { schema: managerConfigSchema })).not.toThrow();
  });

  it('accepts numbers given as strings', () => {
    const raw = minimal();
    raw.cache.reloadBpmnSchemasInterval = '60000';
    raw.message_queue.maxHandlingMessages = '2';
    raw.db.port = '5432';

    expect(() => Config.fromObject(raw as any, { schema: managerConfigSchema })).not.toThrow();
  });

  it.each(['cache', 'db', 'log', 'message_queue'])('requires the %s section', (key) => {
    const raw = minimal();
    delete raw[key];

    const error = validationError(raw);
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(error.issues.map((i) => i.path)).toContain(key);
  });

  it('requires log.console', () => {
    const raw = minimal();
    delete raw.log.console;

    expect(validationError(raw).issues.map((i) => i.path)).toContain('log.console');
  });

  it('never puts a config value into the error message', () => {
    const raw = minimal();
    raw.db.password = SENTINEL;
    raw.db.port = { value: SENTINEL };

    const error = validationError(raw);
    expect(error.message).not.toContain(SENTINEL);
  });
});
