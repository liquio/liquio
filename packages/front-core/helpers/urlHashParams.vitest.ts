import { afterEach, describe, expect, it } from 'vitest';
import urlHashParams from 'helpers/urlHashParams';

afterEach(() => {
  window.history.replaceState('', document.title, '/');
});

describe('urlHashParams', () => {
  it('parses the current location hash and clears it from the URL', () => {
    window.history.replaceState('', document.title, '/#token=abc&state=xyz');
    expect(urlHashParams()).toEqual({ token: 'abc', state: 'xyz' });
    expect(window.location.hash).toBe('');
  });
});
