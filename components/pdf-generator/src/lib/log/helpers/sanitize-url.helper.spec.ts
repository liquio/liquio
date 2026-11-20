import { sanitizeUrl, sanitizeUrlsInText } from './sanitize-url.helper';

describe('sanitizeUrl', () => {
  it('drops query, fragment and userinfo', () => {
    expect(sanitizeUrl('https://user:pass@host.test/a/b?token=x#h')).toBe('https://host.test/a/b');
    expect(sanitizeUrl('/pdf?token=x')).toBe('/pdf');
  });

  it('keeps only the type of data URLs and limits length', () => {
    expect(sanitizeUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64');
    expect(sanitizeUrl(`https://h.test/${'a'.repeat(500)}`)).toHaveLength(200);
    expect(sanitizeUrl(undefined)).toBe('');
  });
});

describe('sanitizeUrlsInText', () => {
  it('strips queries of URLs inside text', () => {
    expect(sanitizeUrlsInText('net::ERR at https://u:p@h.test/x?token=s&a=1 failed')).toBe('net::ERR at https://h.test/x failed');
  });
});
