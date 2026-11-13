import * as jwt from 'jsonwebtoken';

import Token from './index';

const SECRET = 'test-secret';
const userInfo = { authUserInfo: { userId: 'u1' }, authTokens: { accessToken: 'a', refreshToken: 'r' } };

const create = (config: Record<string, any> = {}): Token => {
  (Token as any).singleton = undefined;
  return new Token({ jwtSecret: SECRET, ...config });
};

describe('Token', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should generate a token with exp and iat (default ttl 24h)', () => {
    const decoded: any = jwt.decode(create().generate(userInfo));
    expect(decoded.exp - decoded.iat).toBe(86400);
  });

  it('should use configured ttlSeconds', () => {
    const decoded: any = jwt.decode(create({ ttlSeconds: 60 }).generate(userInfo));
    expect(decoded.exp - decoded.iat).toBe(60);
  });

  it('should accept a fresh token', () => {
    const token = create();
    expect(token.decrypt(token.generate(userInfo)).userId).toBe('u1');
  });

  it('should reject an expired token', () => {
    const token = create({ ttlSeconds: 60 });
    const str = token.generate(userInfo);
    jest.useFakeTimers().setSystemTime(Date.now() + 61000);
    expect(() => token.decrypt(str)).toThrow(jwt.TokenExpiredError);
  });

  it('should reject a token without exp by default', () => {
    const token = create();
    const legacy = jwt.sign({ userId: 'u1', authTokens: userInfo.authTokens }, SECRET);
    expect(() => token.decrypt(legacy)).toThrow('without expiration');
  });

  it('should accept a token without exp until legacyTokensAllowedUntil', () => {
    const legacy = jwt.sign({ userId: 'u1', authTokens: userInfo.authTokens }, SECRET);
    const until = new Date(Date.now() + 3600000).toISOString();
    const token = create({ legacyTokensAllowedUntil: until });
    expect(token.decrypt(legacy).userId).toBe('u1');
    jest.useFakeTimers().setSystemTime(Date.now() + 7200000);
    expect(() => token.decrypt(legacy)).toThrow('without expiration');
  });

  describe('isFresh', () => {
    const now = Math.floor(Date.now() / 1000) + 5;

    it('should be true within the default 15 minutes window', () => {
      const token = create();
      expect(token.isFresh({ iat: now - 10 })).toBe(true);
      expect(token.isFresh({ iat: now - 895 })).toBe(true);
    });

    it('should be false outside the window', () => {
      expect(create().isFresh({ iat: now - 1000 })).toBe(false);
    });

    it('should respect jwtOnlyFreshnessSeconds', () => {
      const token = create({ jwtOnlyFreshnessSeconds: 30 });
      expect(token.isFresh({ iat: now - 20 })).toBe(true);
      expect(token.isFresh({ iat: now - 60 })).toBe(false);
    });

    it('should be false without iat or with iat in the future', () => {
      const token = create();
      expect(token.isFresh({})).toBe(false);
      expect(token.isFresh(undefined)).toBe(false);
      expect(token.isFresh({ iat: now + 1000 })).toBe(false);
    });
  });
});
