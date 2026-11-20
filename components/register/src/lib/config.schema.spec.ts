import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Config as ConfigLoader, ConfigValidationError } from '@liquio/back-core';

import { buildRegisterConfigSchema, KNOWN_DEFAULT_TOKEN_HASHES } from './config.schema';

const basic = (pair: string) => `Basic ${Buffer.from(pair).toString('base64')}`;
const GOOD_TOKEN = basic('register:s3cr3t-long-password');
const HARNESS_TOKEN = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA==';
const TEMPLATES = path.resolve(__dirname, '../../../../config-templates/register');
const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

const loadTemplate = (): any => {
  const raw: any = ConfigLoader.load({ configPath: TEMPLATES, secretPath: null }).toObject();
  raw.auth.tokens = [HARNESS_TOKEN];
  return raw;
};

const parse = (raw: any, env = 'test') => buildRegisterConfigSchema(env).safeParse(raw);
const issues = (raw: any, env = 'test') => {
  const result = parse(raw, env);
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
};

describe('register config schema', () => {
  it('accepts the shipped template with the harness token for test and production', () => {
    expect(parse(loadTemplate(), 'test').success).toBe(true);
    expect(parse(loadTemplate(), 'production').success).toBe(true);
  });

  it('keeps unknown top-level and nested keys in toObject()', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'register-schema-'));
    try {
      fs.cpSync(TEMPLATES, dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ tokens: [GOOD_TOKEN], limitedAccess: [], extra: 1 }));
      fs.writeFileSync(path.join(dir, 'extra.json'), JSON.stringify({ a: 1 }));
      const obj: any = ConfigLoader.load({ configPath: dir, secretPath: null, schema: buildRegisterConfigSchema('test') }).toObject();
      expect(obj.extra).toEqual({ a: 1 });
      expect(obj.auth.extra).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes with every optional section absent', () => {
    const raw = loadTemplate();
    for (const key of ['admin', 'key_signature', 'redis', 'sandbox', 'search']) delete raw[key];
    delete raw.auth.trustedCallers;
    delete raw.auth.strict;
    delete raw.encryption.check_on_startup;
    expect(issues(raw)).toEqual([]);
  });

  it.each(['access_log', 'afterhandler', 'app', 'auth', 'db', 'encryption', 'filters', 'log', 'pagination', 'server', 'sign'])(
    'rejects a missing %s',
    (key) => {
      const raw = loadTemplate();
      delete raw[key];
      expect(issues(raw).some((i) => i.path === key)).toBe(true);
    },
  );

  describe('auth rules', () => {
    const withTokens = (tokens: any, extra: any = {}) => {
      const raw = loadTemplate();
      raw.auth = { ...raw.auth, tokens, ...extra };
      return raw;
    };

    it('rejects empty or missing tokens', () => {
      const message = 'is empty: at least one Basic auth token must be configured.';
      expect(issues(withTokens([]))).toEqual([{ path: 'auth.tokens', message }]);
      expect(issues(withTokens(undefined))).toEqual([{ path: 'auth.tokens', message }]);
    });

    it('flags empty, non-string, placeholder and weak tokens per index', () => {
      const raw = withTokens([
        '  ',
        5,
        'changeme',
        basic('u:short'),
        basic('u:<REDACTED>'),
        basic('nocolon'),
        basic('u:long-enough-pass'),
        'Bearer x',
      ]);
      expect(issues(raw, 'dev')).toEqual([
        { path: 'auth.tokens.0', message: 'is empty or not a string.' },
        { path: 'auth.tokens.1', message: 'is empty or not a string.' },
        { path: 'auth.tokens.2', message: 'is a placeholder value.' },
        { path: 'auth.tokens.3', message: 'password is shorter than 8 characters.' },
        { path: 'auth.tokens.4', message: 'decodes to a placeholder value.' },
        { path: 'auth.tokens.5', message: 'password is shorter than 8 characters.' },
      ]);
    });

    it('detects a raw placeholder token', () => {
      expect(issues(withTokens(['Basic <REDACTED>']))).toEqual([{ path: 'auth.tokens.0', message: 'is a placeholder value.' }]);
    });

    describe('known default token', () => {
      const DEFAULT = basic(['register', 'OaUiZ70kuHLj'].join(':'));
      const message = 'is a publicly known default token from the repository, rotate it (or set auth.allowKnownDefaultToken=true).';

      it('is refused in production only', () => {
        expect(issues(withTokens([GOOD_TOKEN, DEFAULT]), 'production')).toEqual([{ path: 'auth.tokens.1', message }]);
        expect(issues(withTokens([DEFAULT]), 'prod')).toHaveLength(1);
        expect(issues(withTokens([DEFAULT]), 'development')).toEqual([]);
        expect(issues(withTokens([DEFAULT]), undefined as any)).toEqual([]);
      });

      it('is allowed in production with allowKnownDefaultToken', () => {
        expect(issues(withTokens([DEFAULT], { allowKnownDefaultToken: true }), 'production')).toEqual([]);
      });

      it('matches by hash of the normalized token', () => {
        const token = basic('someone:another-long-password');
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        KNOWN_DEFAULT_TOKEN_HASHES.push(hash);
        try {
          expect(issues(withTokens([token]), 'production')).toEqual([{ path: 'auth.tokens.0', message }]);
        } finally {
          KNOWN_DEFAULT_TOKEN_HASHES.pop();
        }
      });
    });

    it('rejects a non-boolean strict', () => {
      expect(issues(withTokens([GOOD_TOKEN], { strict: 'yes' }))).toEqual([{ path: 'auth.strict', message: 'must be a boolean.' }]);
    });

    it('validates servicePermissions', () => {
      const sp = (servicePermissions: any) => issues(withTokens([GOOD_TOKEN], { servicePermissions }));
      expect(sp({ a: { routes: ['GET /records'], keys: [1, 'b'] } })).toEqual([]);
      expect(sp([])).toEqual([{ path: 'auth.servicePermissions', message: 'must be an object.' }]);
      expect(sp({ a: 'x' })).toEqual([{ path: 'auth.servicePermissions.a', message: 'must be an object.' }]);
      expect(sp({ a: { routes: 'GET /records', keys: [{}] } })).toEqual([
        { path: 'auth.servicePermissions.a.routes', message: 'must be an array of strings.' },
        { path: 'auth.servicePermissions.a.keys', message: 'must be an array of key ids.' },
      ]);
    });

    it('never prints token values', () => {
      const result = parse(withTokens([SENTINEL, basic('u:abc')]));
      expect(result.success).toBe(false);
      const text = JSON.stringify(result.error!.issues);
      expect(text).not.toContain(SENTINEL.slice(6));
      expect(text).not.toContain(Buffer.from('u:abc').toString('base64'));
    });
  });

  it('rejects a placeholder encryption key and keeps the key out of the message', () => {
    const raw = loadTemplate();
    raw.encryption.key = '<REDACTED>';
    expect(issues(raw)).toEqual([{ path: 'encryption.key', message: 'is a placeholder value.' }]);
    raw.encryption.key = '';
    expect(issues(raw)).toEqual([]);
  });

  it('the loader throws ConfigValidationError and the message has no secret', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'register-schema-'));
    try {
      fs.cpSync(TEMPLATES, dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ tokens: [SENTINEL, 'Basic <REDACTED>'], limitedAccess: [] }));
      let error: any;
      try {
        ConfigLoader.load({ configPath: dir, secretPath: null, schema: buildRegisterConfigSchema('production') });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect(error.issues.map((i: any) => i.path)).toContain('auth.tokens.1');
      expect(error.message).not.toContain(SENTINEL.slice(6));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
