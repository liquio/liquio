import { checkUrl, isPrivateAddress } from './url-guard';

const publicLookup = jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

describe('url-guard', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isPrivateAddress', () => {
    it.each([
      '127.0.0.1',
      '127.1.2.3',
      '0.0.0.0',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '224.0.0.1',
      '255.255.255.255',
      '::',
      '::1',
      'fc00::1',
      'fd12:3456::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:169.254.169.254',
      '64:ff9b::a00:1',
      'not-an-ip',
    ])('treats %s as private', (ip) => {
      expect(isPrivateAddress(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '93.184.216.34', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('treats %s as public', (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    });
  });

  describe('checkUrl', () => {
    it.each(['data:image/png;base64,AAAA', 'about:blank', 'blob:null/1234'])('allows local scheme %s', async (url) => {
      expect((await checkUrl(url)).allowed).toBe(true);
    });

    it.each(['file:///etc/passwd', 'ftp://example.com/a', 'ws://example.com/', 'chrome://version', 'javascript:alert(1)'])(
      'blocks scheme of %s',
      async (url) => {
        const result = await checkUrl(url, { allowedHosts: ['example.com'], lookup: publicLookup });
        expect(result).toMatchObject({ allowed: false, reason: 'scheme-not-allowed' });
      },
    );

    it('blocks invalid URLs', async () => {
      expect((await checkUrl('http://')).allowed).toBe(false);
      expect((await checkUrl('not a url')).allowed).toBe(false);
    });

    it('blocks all remote hosts when allowedHosts is empty', async () => {
      const result = await checkUrl('https://example.com/a.png', { lookup: publicLookup });
      expect(result).toMatchObject({ allowed: false, reason: 'host-not-allowed' });
      expect(publicLookup).not.toHaveBeenCalled();
    });

    it('blocks hosts outside allowedHosts without resolving them', async () => {
      const result = await checkUrl('https://evil.test/a.png', { allowedHosts: ['example.com'], lookup: publicLookup });
      expect(result.allowed).toBe(false);
      expect(publicLookup).not.toHaveBeenCalled();
    });

    it('allows an allowlisted host that resolves to public addresses', async () => {
      const result = await checkUrl('https://Example.com/a.png', { allowedHosts: ['example.com'], lookup: publicLookup });
      expect(result.allowed).toBe(true);
      expect(result.addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
    });

    it('blocks an allowlisted host that resolves to a private address (DNS rebinding)', async () => {
      const lookup = jest.fn().mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
      const result = await checkUrl('http://example.com/', { allowedHosts: ['example.com'], lookup });
      expect(result).toMatchObject({ allowed: false, reason: 'private-address' });
    });

    it('blocks when any of several resolved addresses is private', async () => {
      const lookup = jest.fn().mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ]);
      expect((await checkUrl('http://example.com/', { allowedHosts: ['example.com'], lookup })).allowed).toBe(false);
    });

    it('blocks when DNS fails', async () => {
      const lookup = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));
      expect(await checkUrl('http://example.com/', { allowedHosts: ['example.com'], lookup })).toMatchObject({
        allowed: false,
        reason: 'dns-failure',
      });
    });

    it.each([
      'http://127.0.0.1/',
      'http://localhost/',
      'http://2130706433/',
      'http://0x7f.0.0.1/',
      'http://0177.0.0.1/',
      'http://127.1/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.1:8200/v1/secret',
    ])('blocks %s even if it is allowlisted', async (url) => {
      const { hostname } = new URL(url);
      const lookup = jest.fn().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const result = await checkUrl(url, { allowedHosts: [hostname, hostname.replace(/^\[|\]$/g, '')], lookup });
      expect(result.allowed).toBe(false);
    });

    it('blocks everything that is not http(s) in remoteOnly mode', async () => {
      expect((await checkUrl('data:text/plain,a', { remoteOnly: true })).allowed).toBe(false);
    });
  });
});
