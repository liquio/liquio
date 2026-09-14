import { afterEach, describe, expect, it } from 'vitest';
import getCookie from 'helpers/getCookie';

afterEach(() => {
  for (const cookie of document.cookie.split(';')) {
    document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; path=/`;
  }
});

describe('getCookie', () => {
  it('returns undefined for an absent cookie', () => {
    expect(getCookie('lang')).toBeUndefined();
  });

  it('matches the exact name among multiple cookies', () => {
    document.cookie = 'otherlang=en; path=/';
    document.cookie = 'lang=uk; path=/';
    document.cookie = 'theme=dark; path=/';
    expect(getCookie('lang')).toBe('uk');
  });

  it('preserves empty and encoded values', () => {
    document.cookie = 'empty=; path=/';
    document.cookie = 'token=a=b%20c; path=/';
    expect(getCookie('empty')).toBe('');
    expect(getCookie('token')).toBe('a=b%20c');
  });
});
