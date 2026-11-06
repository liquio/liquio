import { isLocalPath, resolveSafeRedirect } from './safe_redirect';

describe('safe_redirect', () => {
  const registered = ['https://app.example/auth', 'https://other.example/cb?x=1'];

  describe('isLocalPath', () => {
    it.each(['/', '/profile', '/a/b?c=d#e'])('accepts %s', (value) => expect(isLocalPath(value)).toBe(true));

    it.each(['', 'profile', '//evil.example', '/\\evil.example', '/ev\til', '/a\nb', '/a b', 'https://evil.example', '%2F%2Fevil.example'])(
      'rejects %j',
      (value) => expect(isLocalPath(value)).toBe(false),
    );
  });

  describe('resolveSafeRedirect', () => {
    it('keeps local paths and exact registered URIs', () => {
      expect(resolveSafeRedirect('/profile', registered)).toBe('/profile');
      expect(resolveSafeRedirect('https://app.example/auth', registered)).toBe('https://app.example/auth');
      expect(resolveSafeRedirect('https://other.example/cb?x=1', registered)).toBe('https://other.example/cb?x=1');
    });

    it.each([
      ['an unregistered origin', 'https://evil.example/'],
      ['a suffix lookalike', 'https://app.example/auth.evil.example'],
      ['a path-extended URI', 'https://app.example/auth/../../x'],
      ['a different query', 'https://other.example/cb?x=2'],
      ['a userinfo lookalike', 'https://app.example@evil.example/auth'],
      ['a protocol-relative URL', '//app.example/auth'],
      ['a javascript URL', 'javascript:alert(1)'],
    ])('falls back for %s', (_name, value) => {
      expect(resolveSafeRedirect(value, registered)).toBe('/');
    });

    it('falls back for absent or non-string values', () => {
      expect(resolveSafeRedirect(undefined, registered)).toBe('/');
      expect(resolveSafeRedirect('', registered)).toBe('/');
      expect(resolveSafeRedirect(['/a', '/b'], registered)).toBe('/');
      expect(resolveSafeRedirect({}, registered)).toBe('/');
    });

    it('rejects any external URL when nothing is registered', () => {
      expect(resolveSafeRedirect('https://app.example/auth')).toBe('/');
    });
  });
});
