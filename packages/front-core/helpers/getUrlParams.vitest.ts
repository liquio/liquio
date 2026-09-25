import { describe, expect, it } from 'vitest';
import getUrlParams from 'helpers/getUrlParams';

describe('getUrlParams', () => {
  it('parses query parameters from a full URL', () => {
    expect(getUrlParams('https://example.com/page?a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('parses a bare query string', () => {
    expect(getUrlParams('?a=1')).toEqual({ a: '1' });
  });

  it('decodes URI-encoded values', () => {
    expect(getUrlParams('?redirect=%2Fhome')).toEqual({ redirect: '/home' });
  });
});
