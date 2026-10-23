import { afterEach, describe, expect, it } from 'vitest';
import setCookie from 'helpers/setCookie';

afterEach(() => {
  for (const cookie of document.cookie.split(';')) {
    document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; path=/`;
  }
});

describe('setCookie', () => {
  it('sets a cookie readable via document.cookie on localhost, without a domain attribute', () => {
    setCookie('lang', 'uk', 7);
    expect(document.cookie).toContain('lang=uk');
  });
});
