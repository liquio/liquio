import { assertValidBasicAuthTokens, isBasicAuthTokenAllowed } from './auth-tokens';

const toToken = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;

describe('auth-tokens', () => {
  describe('assertValidBasicAuthTokens', () => {
    it.each([undefined, null, 'token', [], {}])('rejects missing or empty value: %p', (value) => {
      expect(() => assertValidBasicAuthTokens(value)).toThrow('at least one token');
    });

    it('rejects the publicly known default token', () => {
      expect(() => assertValidBasicAuthTokens(['Basic dXNlcm5hbWU6cGFzc3dvcmQ='])).toThrow('publicly known default');
    });

    it('rejects malformed tokens', () => {
      expect(() => assertValidBasicAuthTokens(['Bearer abc'])).toThrow('must be "Basic');
      expect(() => assertValidBasicAuthTokens([toToken('no-colon-here-0123456789')])).toThrow('must be "Basic');
      expect(() => assertValidBasicAuthTokens([42])).toThrow('must be "Basic');
    });

    it('rejects empty passwords', () => {
      expect(() => assertValidBasicAuthTokens([toToken('user:')])).toThrow('must not be empty');
    });

    it('does not leak token values in error messages', () => {
      const token = toToken('user:');

      expect(() => assertValidBasicAuthTokens([token])).not.toThrow(token);
    });

    it('accepts configured tokens, including passwords with colons', () => {
      expect(() => assertValidBasicAuthTokens([toToken('user:a-long-random-secret-1'), toToken('svc:abc:def:0123456789')])).not.toThrow();
    });
  });

  describe('isBasicAuthTokenAllowed', () => {
    const allowed = [toToken('user:a-long-random-secret-1'), toToken('svc:another-long-secret-2')];

    it('allows any configured token', () => {
      expect(isBasicAuthTokenAllowed(allowed[0], allowed)).toBe(true);
      expect(isBasicAuthTokenAllowed(allowed[1], allowed)).toBe(true);
    });

    it('rejects unknown tokens', () => {
      expect(isBasicAuthTokenAllowed(toToken('user:wrong'), allowed)).toBe(false);
      expect(isBasicAuthTokenAllowed('', allowed)).toBe(false);
    });
  });
});
