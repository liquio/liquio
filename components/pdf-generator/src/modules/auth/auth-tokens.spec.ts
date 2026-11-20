import { isBasicAuthTokenAllowed } from './auth-tokens';

const toToken = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;

describe('auth-tokens', () => {
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
