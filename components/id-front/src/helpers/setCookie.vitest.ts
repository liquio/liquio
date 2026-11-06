import { afterEach, describe, expect, it, vi } from 'vitest';

import setCookie from 'helpers/setCookie';

const captureCookieWrites = () => {
  const writes: string[] = [];
  vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
    writes.push(value);
  });
  return writes;
};

const stubOrigin = (origin: string) => {
  vi.stubGlobal('location', { ...window.location, origin });
};

describe('setCookie', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes name, value, expiry, path and domain', () => {
    stubOrigin('https://id.example.com');
    const writes = captureCookieWrites();

    setCookie('lang', 'eng', 1);

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/^lang=eng;expires=[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT;path=\/;domain=id\.example\.com$/);
  });

  it('sets the expiry exdays days from now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    stubOrigin('https://id.example.com');
    const writes = captureCookieWrites();

    setCookie('lang', 'eng', 2);
    vi.useRealTimers();

    expect(writes[0]).toContain('expires=Thu, 03 Jan 2030 00:00:00 GMT');
  });

  it('keeps only the last three labels of the host name', () => {
    stubOrigin('https://a.b.id.example.com');
    const writes = captureCookieWrites();

    setCookie('lang', 'eng', 1);

    expect(writes[0]).toMatch(/;domain=id\.example\.com$/);
  });

  it('keeps the port in the domain (preserved: the regex captures everything up to the next slash)', () => {
    stubOrigin('http://localhost:3000');
    const writes = captureCookieWrites();

    setCookie('lang', 'eng', 1);

    expect(writes[0]).toMatch(/;domain=localhost:3000$/);
  });

  it('throws when the origin has no scheme separator (preserved)', () => {
    stubOrigin('null');
    captureCookieWrites();

    expect(() => setCookie('lang', 'eng', 1)).toThrow(TypeError);
  });
});
