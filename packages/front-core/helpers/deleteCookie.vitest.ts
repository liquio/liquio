import { afterEach, describe, expect, it } from 'vitest';
import deleteCookie from 'helpers/deleteCookie';

afterEach(() => {
  for (const cookie of document.cookie.split(';')) {
    document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; path=/`;
  }
});

describe('deleteCookie', () => {
  it('expires the named cookie', () => {
    document.cookie = 'lang=uk; path=/';
    expect(document.cookie).toContain('lang=uk');
    deleteCookie('lang');
    expect(document.cookie).not.toContain('lang=uk');
  });

  it('leaves other cookies untouched', () => {
    document.cookie = 'lang=uk; path=/';
    document.cookie = 'theme=dark; path=/';
    deleteCookie('lang');
    expect(document.cookie).toContain('theme=dark');
  });
});
