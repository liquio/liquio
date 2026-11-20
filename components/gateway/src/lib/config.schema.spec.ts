import path from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { gatewayConfigSchema } from './config.schema';

const TEMPLATES = path.join(__dirname, '../../../../config-templates/gateway');
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

const minimal = (): Record<string, any> => ({ db: {}, log: { console: { name: 'x' } }, message_queue: {} });
const fromObject = (raw: Record<string, any>) => Config.fromObject<any>(raw, { schema: gatewayConfigSchema });

describe('gateway config schema', () => {
  it('accepts config-templates/gateway', () => {
    const config = Config.load<any>({ configPath: TEMPLATES, secretPath: null, schema: gatewayConfigSchema });
    expect(config.toObject().db).toBeDefined();
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw: Record<string, any> = { ...minimal(), extra: { a: 1 } };
    raw.log.unknown = 2;
    const obj = fromObject(raw).toObject();
    expect(obj.extra).toEqual({ a: 1 });
    expect(obj.log.unknown).toBe(2);
  });

  it('accepts string-typed numbers and booleans from env overrides', () => {
    const raw: Record<string, any> = { ...minimal(), redis: { isEnabled: 'true', host: 'h', port: '6379' } };
    raw.message_queue = { maxHandlingMessages: '2' };
    expect(() => fromObject(raw)).not.toThrow();
  });

  it.each(['log', 'db', 'message_queue'])('rejects missing %s', (key) => {
    const raw = minimal();
    delete raw[key];
    try {
      fromObject(raw);
      throw new Error('expected failure');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect(e.issues.map((i: any) => i.path)).toContain(key);
    }
  });

  it('rejects missing log.console', () => {
    const raw = minimal();
    raw.log = {};
    expect(() => fromObject(raw)).toThrow(ConfigValidationError);
  });

  it('does not put config values into error messages', () => {
    const raw = minimal();
    raw.log = { console: SENTINEL };
    raw.redis = { host: SENTINEL, port: { v: SENTINEL } };
    try {
      fromObject(raw);
      throw new Error('expected failure');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect(e.message).not.toContain(SENTINEL);
    }
  });
});
