import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  adminCookieOptions,
  clearAdminSessionsForTests,
  createAdminSession,
  isLoginBlocked,
  recordLoginFailure,
  verifyAdminCredentials,
  verifyAdminSession,
} from './adminSession';

describe('adminSession', () => {
  beforeEach(() => {
    (global as any).conf = { adminConfig: { login: 'l', password: 'p' } };
    clearAdminSessionsForTests();
  });
  afterEach(() => jest.useRealTimers());

  it('verifies credentials', () => {
    expect(verifyAdminCredentials('l', 'p')).toBe(true);
    expect(verifyAdminCredentials('l', 'x')).toBe(false);
    expect(verifyAdminCredentials(undefined, undefined)).toBe(false);
  });

  it('expires sessions after the TTL', () => {
    jest.useFakeTimers();
    const req = { cookies: { [ADMIN_COOKIE_NAME]: createAdminSession() } };
    expect(verifyAdminSession(req)).toBe(true);
    jest.setSystemTime(Date.now() + ADMIN_SESSION_TTL_MS + 1);
    expect(verifyAdminSession(req)).toBe(false);
  });

  it('issues unique ids', () => {
    expect(createAdminSession()).not.toBe(createAdminSession());
  });

  it('sets secure cookie attributes', () => {
    expect(adminCookieOptions({ headers: {} })).toEqual({ path: '/admin', httpOnly: true, sameSite: 'strict', secure: false });
    expect(adminCookieOptions({ headers: { 'x-forwarded-proto': 'https' } }).secure).toBe(true);
    expect(adminCookieOptions({ headers: {}, secure: true }).secure).toBe(true);
  });

  it('blocks an ip after repeated failures', () => {
    for (let i = 0; i < 10; i++) recordLoginFailure('1.1.1.1');
    expect(isLoginBlocked('1.1.1.1')).toBe(true);
    expect(isLoginBlocked('2.2.2.2')).toBe(false);
  });
});
