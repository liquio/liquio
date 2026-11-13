import { describe, expect, it } from 'vitest';

import { getUrlParams, urlParams } from 'helpers/getUrlParams';

describe('urlParams', () => {
  it('joins entries as key=value pairs without encoding', () => {
    expect(urlParams({ a: 1, b: 'x y', c: true })).toBe('a=1&b=x y&c=true');
  });

  it('returns an empty string for an empty object', () => {
    expect(urlParams({})).toBe('');
  });

  it('stringifies null and undefined values (preserved)', () => {
    expect(urlParams({ a: null, b: undefined })).toBe('a=null&b=undefined');
  });
});

describe('getUrlParams', () => {
  it('parses a query string with a leading question mark', () => {
    expect(getUrlParams('?code=abc&state=xyz')).toEqual({ code: 'abc', state: 'xyz' });
  });

  it('parses a full URL by taking everything after the first question mark', () => {
    expect(getUrlParams('https://example.com/cb?code=abc')).toEqual({ code: 'abc' });
  });

  it('parses a bare query string without a question mark', () => {
    expect(getUrlParams('code=abc&state=xyz')).toEqual({ code: 'abc', state: 'xyz' });
  });

  it('decodes percent-encoded values', () => {
    expect(getUrlParams('?name=J%C3%BCrgen%20K&url=https%3A%2F%2Fa.b')).toEqual({ name: 'Jürgen K', url: 'https://a.b' });
  });

  it('lets a later duplicate key win', () => {
    expect(getUrlParams('?a=1&a=2')).toEqual({ a: '2' });
  });

  it('truncates a value at a second equals sign (preserved)', () => {
    expect(getUrlParams('?token=abc=def')).toEqual({ token: 'abc' });
  });

  it('turns a key without a value into the string "undefined" (preserved)', () => {
    expect(getUrlParams('?flag')).toEqual({ flag: 'undefined' });
  });

  it('returns an empty-key entry for an empty string (preserved)', () => {
    expect(getUrlParams('')).toEqual({ '': 'undefined' });
  });

  it('throws on a malformed percent escape (preserved)', () => {
    expect(() => getUrlParams('?a=%E0%A4%A')).toThrow(URIError);
  });
});
