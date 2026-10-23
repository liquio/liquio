import { profileCookieOptions, resolveSameSite, resolveSecure } from './cookie_options';

describe('cookie_options', () => {
  it('defaults to auto secure and lax SameSite', () => {
    expect(resolveSecure({})).toBe('auto');
    expect(resolveSameSite({})).toBe('lax');
  });

  it('marks the profile cookie Secure only for https requests by default', () => {
    expect(profileCookieOptions({ secure: true }, { domain: '.example' })).toMatchObject({
      domain: '.example',
      secure: true,
      sameSite: 'lax',
      httpOnly: false,
    });
    expect(profileCookieOptions({ secure: false }, {})).toMatchObject({ domain: '.liquio', secure: false });
  });

  it('honours explicit configuration and extra options', () => {
    const expires = new Date();
    const options = profileCookieOptions({ secure: false }, { cookies: { secure: true, sameSite: 'strict', profileHttpOnly: true } }, { expires });
    expect(options).toMatchObject({ secure: true, sameSite: 'strict', httpOnly: true, expires });
  });
});
