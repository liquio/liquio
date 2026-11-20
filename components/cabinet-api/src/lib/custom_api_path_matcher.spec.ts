import { compilePathMatcher, isSuspiciousPath } from './custom_api_path_matcher';

describe('custom_api_path_matcher', () => {
  describe('compilePathMatcher', () => {
    it('matches a plain path exactly', () => {
      const m = compilePathMatcher('/items');
      expect(m('/items')).toBe(true);
      expect(m('/items/')).toBe(false);
      expect(m('/Items')).toBe(false);
      expect(m('/items/1')).toBe(false);
    });

    it('matches a :param segment as exactly one segment', () => {
      const m = compilePathMatcher('/items/:id');
      expect(m('/items/42')).toBe(true);
      expect(m('/items/')).toBe(false);
      expect(m('/items/42/extra')).toBe(false);
      expect(m('/other/42')).toBe(false);
      expect(m('/items')).toBe(false);
    });

    it('supports params in the middle of a path', () => {
      const m = compilePathMatcher('/a/:x/b');
      expect(m('/a/1/b')).toBe(true);
      expect(m('/a/1/c')).toBe(false);
    });
  });

  describe('isSuspiciousPath', () => {
    it.each(['/a%2Fb', '/a%2fb', '/a%5Cb', '/a%5cb', '/a%00', '/a/../b', '/..', '/a/%2e%2e/b', '/a\\b'])('rejects %s', (p) => {
      expect(isSuspiciousPath(p)).toBe(true);
    });

    it.each(['/items/42', '/a..b', '/a/.hidden', '/a%20b'])('accepts %s', (p) => {
      expect(isSuspiciousPath(p)).toBe(false);
    });
  });
});
