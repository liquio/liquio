import { isMainProxyPathAllowed, normalizeProxyPath } from './proxy_filter';

const allowed = (path: string, cfg = {}, method = 'GET') => isMainProxyPathAllowed(method, path, cfg);

describe('isMainProxyPathAllowed', () => {
  it.each([
    '/external_services/x',
    '/External-Services/x',
    '/external-services/workflow/soap',
    '/external_services',
    '//test/ping/services',
    '/test/ping/committed-documents/1',
    '/TEST/ping',
    '/test/ping/../auth/bearer',
    '/auth/bearer',
    '/auth/bearer/',
    '/AUTH//bearer',
    '/auth/bearer?x=1',
    '/external_reader/mocks-keys-by-user',
    '/external_services%2fx',
    '/external_services%2Fx',
    '/test%5cping',
    '/test/ping%00',
    '/test%00/ping',
    '/a/%2e%2e/test',
    '/a/%252e%252e/test',
    '/external%252fservices',
    '/test\\ping',
    '/%',
    '/test/./ping',
    '/%2574est/ping',
  ])('denies %s', (path) => {
    expect(allowed(path)).toBe(false);
  });

  it('denies encoded variants of a denied prefix', () => {
    expect(allowed('/%74est/ping/services')).toBe(false);
    expect(allowed('/external%5Fservices/x')).toBe(false);
  });

  it.each([
    '/tasks',
    '/payment/x/y',
    '/auth/me',
    '/authx/bearer',
    '/testing',
    '/external_reader',
    '/external_reader/async',
    '/external_reader/captcha/providers/list',
    '/external_reader/captcha/a/b',
    '/external_reader/cache',
    '/documents/1/external-reader/check',
    '/healthz',
  ])('allows %s by default', (path) => {
    expect(allowed(path)).toBe(true);
  });

  it('adds configured deny paths to the defaults', () => {
    const cfg = { mainProxyDenyPaths: ['/internal/:id/secret'] };
    expect(allowed('/internal/1/secret/x', cfg)).toBe(false);
    expect(allowed('/internal/1/other', cfg)).toBe(true);
    expect(allowed('/test', cfg)).toBe(false);
  });

  describe('allow-list mode', () => {
    const cfg = { mainProxyAllowPaths: ['/tasks', '/payment/:customer/:status', '/auth/me'] };

    it('allows only listed prefixes, case-insensitively', () => {
      expect(allowed('/tasks/1', cfg)).toBe(true);
      expect(allowed('/Tasks', cfg)).toBe(true);
      expect(allowed('/payment/a/b', cfg)).toBe(true);
      expect(allowed('/payment/a', cfg)).toBe(false);
      expect(allowed('/workflows', cfg)).toBe(false);
      expect(allowed('/tasksx', cfg)).toBe(false);
    });

    it('still applies the deny list and normalisation', () => {
      expect(allowed('/test/ping', { mainProxyAllowPaths: ['/test'] })).toBe(false);
      expect(allowed('/tasks/../workflows', cfg)).toBe(false);
    });

    it('treats an empty allow-list as disabled', () => {
      expect(allowed('/workflows', { mainProxyAllowPaths: [] })).toBe(true);
    });
  });
});

describe('normalizeProxyPath', () => {
  it('collapses slashes, lower-cases and strips the trailing slash and query', () => {
    expect(normalizeProxyPath('//Tasks//1/?a=b')).toBe('/tasks/1');
    expect(normalizeProxyPath('/')).toBe('/');
  });
});
