import jwt from 'jsonwebtoken';

import { Token } from './token';

const SECRET = 'unit-test-secret';
const userInfo = {
  authTokens: { accessToken: 'access', refreshToken: 'refresh' },
  authUserInfo: { userId: 'user-1' },
};

const newToken = (config: any = {}) => {
  (Token as any).singleton = undefined;
  return new Token({ jwtSecret: SECRET, ...config });
};

describe('Token', () => {
  afterEach(() => {
    (Token as any).singleton = undefined;
  });

  it('should round-trip userId and authTokens', () => {
    const token = newToken();
    const data: any = token.decrypt(token.generate(userInfo));
    expect(data.userId).toBe('user-1');
    expect(data.authTokens).toEqual(userInfo.authTokens);
  });

  it('should set a default 12h expiry', () => {
    const token = newToken();
    const data: any = jwt.decode(token.generate(userInfo));
    expect(data.exp - data.iat).toBe(12 * 3600);
  });

  it('should honour auth.jwtExpiresIn', () => {
    const token = newToken({ jwtExpiresIn: '30m' });
    const data: any = jwt.decode(token.generate(userInfo));
    expect(data.exp - data.iat).toBe(1800);
  });

  it('should reject an expired token', () => {
    const token = newToken();
    const expired = jwt.sign({ userId: 'u', authTokens: {} }, SECRET, { algorithm: 'HS256', expiresIn: -10 });
    expect(() => token.decrypt(expired)).toThrow(/expired/i);
  });

  it('should reject a legacy token without exp older than the lifetime', () => {
    const token = newToken();
    const iat = Math.floor(Date.now() / 1000) - 13 * 3600;
    const legacy = jwt.sign({ userId: 'u', authTokens: {}, iat }, SECRET);
    expect(() => token.decrypt(legacy)).toThrow(/maxAge/);
    const recent = jwt.sign({ userId: 'u', authTokens: {} }, SECRET);
    expect((token.decrypt(recent) as any).userId).toBe('u');
  });

  it('should reject an alg none token', () => {
    const token = newToken();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ userId: 'u', authTokens: {} })}.`;
    expect(() => token.decrypt(none)).toThrow();
  });

  it('should reject a token signed with another secret', () => {
    const token = newToken();
    expect(() => token.decrypt(jwt.sign({ userId: 'u' }, 'other', { algorithm: 'HS256' }))).toThrow();
  });

  it('should reject a token signed with another algorithm', () => {
    const token = newToken();
    expect(() => token.decrypt(jwt.sign({ userId: 'u' }, SECRET, { algorithm: 'HS512' }))).toThrow();
  });
});
