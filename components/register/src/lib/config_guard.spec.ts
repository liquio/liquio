import { assertEncryptionConfig, checkEncryptionConfig, warnPlainHttpSign, warnEmptySignToken } from './config_guard';
import { RegisterConfig } from './config';
import { setAppContext } from './context';

const GOOD_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

const cfg = (auth: any, encryption: any): RegisterConfig => ({ auth, encryption }) as unknown as RegisterConfig;

describe('config_guard', () => {
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
  });
});
