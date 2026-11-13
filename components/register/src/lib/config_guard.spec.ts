import {
  assertEncryptionConfig,
  assertSafeConfig,
  checkAuthConfig,
  checkEncryptionConfig,
  warnPlainHttpSign,
  warnEmptySignToken,
} from './config_guard';
import { Config } from './config';
import { setAppContext } from './context';

const basic = (pair: string) => `Basic ${Buffer.from(pair).toString('base64')}`;
const GOOD_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const GOOD_TOKEN = basic('register:s3cr3t-long-password');

const cfg = (auth: any, encryption: any): Config => ({ auth, encryption }) as unknown as Config;

describe('config_guard', () => {
  describe('auth', () => {
    it('rejects empty tokens', () => {
      expect(checkAuthConfig({ auth: { tokens: [] } } as any)).toHaveLength(1);
      expect(checkAuthConfig({ auth: {} } as any)).toHaveLength(1);
    });

    it('rejects placeholder tokens, raw and decoded', () => {
      expect(checkAuthConfig({ auth: { tokens: ['Basic <REDACTED>'] } } as any)).toHaveLength(1);
      expect(checkAuthConfig({ auth: { tokens: [basic('user:<REDACTED>')] } } as any)).toHaveLength(1);
    });

    it('rejects short passwords and missing separator', () => {
      expect(checkAuthConfig({ auth: { tokens: [basic('test:test')] } } as any)).toHaveLength(1);
      expect(checkAuthConfig({ auth: { tokens: [basic('nopassword')] } } as any)).toHaveLength(1);
    });

    describe('known default token (KS-09c)', () => {
      const DEFAULT = basic(['register', 'OaUiZ70kuHLj'].join(':'));

      it('refuses it in production, raw or without the Basic prefix, without printing it', () => {
        const problems = checkAuthConfig({ auth: { tokens: [DEFAULT] } } as any, 'production');
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('publicly known');
        expect(problems.join(' ')).not.toContain(DEFAULT.slice(6));
        expect(checkAuthConfig({ auth: { tokens: [GOOD_TOKEN, DEFAULT] } } as any, 'prod')).toHaveLength(1);
      });

      it('allows it outside production', () => {
        expect(checkAuthConfig({ auth: { tokens: [DEFAULT] } } as any, 'development')).toEqual([]);
        expect(checkAuthConfig({ auth: { tokens: [DEFAULT] } } as any, undefined)).toEqual([]);
      });

      it('allows it in production with auth.allowKnownDefaultToken', () => {
        expect(checkAuthConfig({ auth: { tokens: [DEFAULT], allowKnownDefaultToken: true } } as any, 'production')).toEqual([]);
      });

      it('assertSafeConfig refuses it in production', () => {
        expect(() => assertSafeConfig(cfg({ tokens: [DEFAULT] }, { key: GOOD_KEY }), 'production')).toThrow(/publicly known/);
      });
    });

    it('accepts a strong token', () => {
      expect(checkAuthConfig({ auth: { tokens: [GOOD_TOKEN] } } as any)).toEqual([]);
    });

    it('never prints secret values', () => {
      const problems = checkAuthConfig({ auth: { tokens: [basic('user:abc'), 'Basic <REDACTED>'] } } as any).join(' ');
      expect(problems).not.toContain(Buffer.from('user:abc').toString('base64'));
      expect(problems).not.toContain('REDACTED');
    });
  });

  describe('encryption', () => {
    it('always rejects a placeholder key', () => {
      expect(checkEncryptionConfig({ encryption: { key: '<REDACTED>' } } as any, false)).toHaveLength(1);
    });

    it('allows empty key when nothing is encrypted', () => {
      expect(checkEncryptionConfig({ encryption: { key: '' } } as any, false)).toEqual([]);
    });

    it('rejects empty or malformed key when encrypted keys exist', () => {
      expect(checkEncryptionConfig({ encryption: { key: '' } } as any, true)).toHaveLength(1);
      expect(checkEncryptionConfig({ encryption: { key: 'abcd' } } as any, true)).toHaveLength(1);
      expect(checkEncryptionConfig({ encryption: { key: 'z'.repeat(64) } } as any, true)).toHaveLength(1);
    });

    it('accepts a base64 32-byte key (Helm init-secrets format)', () => {
      const b64 = Buffer.alloc(32, 7).toString('base64');
      expect(checkEncryptionConfig({ encryption: { key: b64 } } as any, true)).toEqual([]);
    });

    it('rejects base64 of the wrong length and names both formats', () => {
      const problems = checkEncryptionConfig({ encryption: { key: Buffer.alloc(16).toString('base64') } } as any, true);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/hex.*base64/);
    });

    it('rejects an invalid key when check_on_startup is on', () => {
      expect(checkEncryptionConfig({ encryption: { key: '', check_on_startup: true } } as any, false)).toHaveLength(1);
    });

    it('accepts a valid key and does not echo it', () => {
      expect(checkEncryptionConfig({ encryption: { key: GOOD_KEY } } as any, true)).toEqual([]);
      expect(() => assertEncryptionConfig(cfg({}, { key: 'abcd' }), true)).toThrow(/encryption\.key/);
      expect(() => assertEncryptionConfig(cfg({}, { key: 'abcd' }), true)).not.toThrow(/abcd/);
    });
  });

  describe('assertSafeConfig', () => {
    it('throws for the unmodified placeholder templates', () => {
      expect(() => assertSafeConfig(cfg({ tokens: ['Basic <REDACTED>'] }, { key: '<REDACTED>' }))).toThrow(/auth\.tokens\[0\].*encryption\.key/);
    });

    it('rejects a malformed servicePermissions config', () => {
      expect(() => assertSafeConfig(cfg({ tokens: [GOOD_TOKEN], servicePermissions: { a: { routes: 'x' } } }, { key: GOOD_KEY }))).toThrow(
        /auth\.servicePermissions\.a\.routes/,
      );
    });

    it('passes for valid config', () => {
      expect(() => assertSafeConfig(cfg({ tokens: [GOOD_TOKEN] }, { key: GOOD_KEY }))).not.toThrow();
    });
  });
});

describe('warnPlainHttpSign', () => {
  const sign = (extra = {}) => ({ sign: { url: 'http://sign', token: 't', timeout: 1, ...extra } }) as any;
  let save: jest.Mock;

  beforeEach(() => {
    save = jest.fn();
    setAppContext({ log: { save } });
  });

  it('warns about http in production', () => {
    expect(warnPlainHttpSign(sign(), 'production')).toBe(true);
    expect(warnPlainHttpSign(sign(), 'prod')).toBe(true);
    expect(save).toHaveBeenCalledWith('sign-plain-http', expect.objectContaining({ key: 'sign.url' }), 'warn');
  });

  it('does not warn for https, with opt-in, or outside production', () => {
    expect(warnPlainHttpSign(sign({ url: 'https://sign' }), 'production')).toBe(false);
    expect(warnPlainHttpSign(sign({ allowPlainHttp: true }), 'production')).toBe(false);
    expect(warnPlainHttpSign(sign(), 'development')).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('warnEmptySignToken', () => {
  const sign = (extra = {}) => ({ sign: { url: 'http://sign', token: '', timeout: 1, ...extra } }) as any;
  let save: jest.Mock;

  beforeEach(() => {
    save = jest.fn();
    setAppContext({ log: { save } });
  });

  it('warns about an empty, missing or placeholder token in production without echoing it', () => {
    expect(warnEmptySignToken(sign(), 'production')).toBe(true);
    expect(warnEmptySignToken(sign({ token: undefined }), 'prod')).toBe(true);
    expect(warnEmptySignToken(sign({ token: '<REDACTED>' }), 'production')).toBe(true);
    expect(save).toHaveBeenCalledWith('sign-empty-token', expect.objectContaining({ key: 'sign.token' }), 'warn');
    expect(JSON.stringify(save.mock.calls)).not.toContain('REDACTED');
  });

  it('does not warn for a real token, with opt-out, or outside production', () => {
    expect(warnEmptySignToken(sign({ token: 'real-token-value' }), 'production')).toBe(false);
    expect(warnEmptySignToken(sign({ allowEmptyToken: true }), 'production')).toBe(false);
    expect(warnEmptySignToken(sign(), 'development')).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('never throws, so the shipped template starts', () => {
    expect(() => warnEmptySignToken({} as any, 'production')).not.toThrow();
    expect(() => assertSafeConfig(cfg({ tokens: [GOOD_TOKEN] }, { key: GOOD_KEY }))).not.toThrow();
  });
});
