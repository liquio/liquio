import { afterEach, describe, expect, it } from 'vitest';

import deleteCookie from 'helpers/deleteCookie';
import getCookie from 'helpers/getCookie';

describe('deleteCookie', () => {
  afterEach(() => {
    document.cookie = 'lang=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('expires the cookie', () => {
    document.cookie = 'lang=eng; path=/';
    expect(getCookie('lang')).toBe('eng');

    deleteCookie('lang');

    expect(getCookie('lang')).toBeUndefined();
  });

  it('does nothing for a cookie that does not exist', () => {
    expect(() => deleteCookie('missing')).not.toThrow();
    expect(getCookie('missing')).toBeUndefined();
  });
});
