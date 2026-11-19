import { resolve } from 'node:path';

import { Config, ConfigValidationError } from '@liquio/back-core';

import { signToolConfigSchema } from './configuration.schema';

const minimal = (): any => ({ server: {} });

const issuesOf = (value: unknown): { path: string; message: string }[] => {
  try {
    Config.fromObject(value as any, { schema: signToolConfigSchema });
  } catch (e: any) {
    expect(e).toBeInstanceOf(ConfigValidationError);
    return e.issues;
  }
  return [];
};

describe('signToolConfigSchema', () => {
  it.each([resolve(__dirname, '../../../../config-templates/sign-tool'), resolve(__dirname, '../../tests/unit-config')])(
    'accepts %s',
    (configPath) => {
      expect(() => Config.load({ configPath, secretPath: null, schema: signToolConfigSchema })).not.toThrow();
    },
  );

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw = { ...minimal(), extra: 1 };
    raw.server.unknown = 'x';
    const out = Config.fromObject(raw, { schema: signToolConfigSchema }).toObject() as any;
    expect(out.extra).toBe(1);
    expect(out.server.unknown).toBe('x');
  });

  it('accepts absent optional sections and a string port', () => {
    const raw = { server: { port: '8080', tls: {} } };
    expect(issuesOf(raw)).toEqual([]);
  });

  it('requires server', () => {
    expect(issuesOf({}).map((i) => i.path)).toContain('server');
  });

  it('rejects wrong types with the offending path', () => {
    const raw = { server: {}, x509: { caCerts: [1] } };
    expect(issuesOf(raw).map((i) => i.path)).toContain('x509.caCerts.0');
  });

  it('does not leak values into the error message', () => {
    try {
      Config.fromObject({ server: 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0' } as any, { schema: signToolConfigSchema });
      throw new Error('expected failure');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect(e.message).not.toContain('c2VudGluZWw6');
    }
  });
});
