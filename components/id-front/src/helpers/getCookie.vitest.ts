import { afterEach, describe, expect, it } from 'vitest';

import getCookie from 'helpers/getCookie';

const clearCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

describe('getCookie', () => {
  afterEach(() => {
    clearCookie('lang');
    clearCookie('other');
  });

  it('returns the value of an existing cookie', () => {
    document.cookie = 'lang=eng; path=/';
    expect(getCookie('lang')).toBe('eng');
  });

  it('picks the right cookie among several', () => {
    document.cookie = 'other=1; path=/';
    document.cookie = 'lang=ukr; path=/';
    expect(getCookie('lang')).toBe('ukr');
    expect(getCookie('other')).toBe('1');
  });

  it('returns undefined when the cookie is missing', () => {
    expect(getCookie('lang')).toBeUndefined();
  });
});
