import { resolve } from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { cabinetApiConfigSchema } from './config.schema';

const minimal = (): any => ({
  auth: { LiquioId: {} },
  db: {},
  discovery: {},
  log: { console: {} },
  server: {},
});

const issuesOf = (value: unknown): { path: string; message: string }[] => {
  try {
    Config.fromObject(value as any, { schema: cabinetApiConfigSchema });
  } catch (e: any) {
    expect(e).toBeInstanceOf(ConfigValidationError);
    return e.issues;
  }
  return [];
};

describe('cabinetApiConfigSchema', () => {
  it('accepts the shipped template', () => {
    const configPath = resolve(__dirname, '../../../../config-templates/cabinet-api');
    expect(() => Config.load({ configPath, secretPath: null, schema: cabinetApiConfigSchema })).not.toThrow();
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw = { ...minimal(), extra: 1 };
    raw.server.unknown = 'x';
    const out = Config.fromObject(raw, { schema: cabinetApiConfigSchema }).toObject() as any;
    expect(out.extra).toBe(1);
    expect(out.server.unknown).toBe('x');
  });

  it('accepts log.console as an array and omitted redis', () => {
    const raw = minimal();
    raw.log.console = [];
    expect(issuesOf(raw)).toEqual([]);
  });

  it.each(['auth', 'db', 'discovery', 'log', 'server'])('requires %s', (key) => {
    const raw = minimal();
    delete raw[key];
    expect(issuesOf(raw).map((i) => i.path)).toContain(key);
  });

  it('requires auth.LiquioId', () => {
    const raw = minimal();
    raw.auth = {};
    expect(issuesOf(raw).map((i) => i.path)).toContain('auth.LiquioId');
  });

  it('does not leak values into the error message', () => {
    const raw = minimal();
    raw.server = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';
    try {
      Config.fromObject(raw, { schema: cabinetApiConfigSchema });
      throw new Error('expected failure');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect(e.message).not.toContain('c2VudGluZWw6');
    }
  });
});
