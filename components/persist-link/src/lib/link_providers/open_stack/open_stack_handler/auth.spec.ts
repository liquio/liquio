const logSave = jest.fn();
jest.mock('../../../context', () => ({
  getLog: () => ({ save: logSave }),
}));

const sendMock = jest.fn();
jest.mock('./http_request', () => ({
  __esModule: true,
  default: { send: (...args) => sendMock(...args), Methods: { POST: 'POST' }, ContentTypes: { CONTENT_TYPE_JSON: 'application/json' } },
}));

import Auth from './auth';

const moduleContext = {
  config: { name: 'main', allowInsecure: true },
  server: 'http://os',
  port: 1,
  routes: { getTokens: '/tokens' },
  tenantName: 't',
  accounts: { admin: { login: 'a', password: 'pw-secret' }, user: { login: 'u', password: 'pw-secret' } },
};

describe('OpenStack Auth logging', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should not log tokens on successful tenant auth', async () => {
    sendMock.mockResolvedValueOnce({ access: { token: { id: 'user-token-secret' } } }).mockResolvedValueOnce({
      access: {
        token: { id: 'tenant-token-secret', tenant: { id: 'tid' } },
        serviceCatalog: [{ endpoints: [{ publicURL: 'http://store/v1/AUTH_tid' }] }],
      },
    });

    const info = await new Auth(moduleContext).getTenantAuthInfo();

    expect(info.tenantToken).toBe('tenant-token-secret');
    expect(logSave).toHaveBeenCalledWith('open-stack-auth', { tenantId: 'tid', tenantPublicUrl: 'http://store/v1/AUTH_tid' });
    const logged = JSON.stringify(logSave.mock.calls);
    expect(logged).not.toContain('token-secret');
    expect(logged).not.toContain('pw-secret');
  });

  it('should log only response keys when the token is missing', async () => {
    sendMock.mockResolvedValueOnce({ access: { leaked: 'body-secret' } });

    await expect(new Auth(moduleContext).getToken()).rejects.toThrow('Token not responsed');

    expect(logSave).toHaveBeenCalledWith('login-error-openstack-response-without-token', { keys: ['access'] });
    expect(JSON.stringify(logSave.mock.calls)).not.toContain('body-secret');
  });

  describe('catalog publicURL scheme', () => {
    const mockCatalog = (publicURL) =>
      sendMock.mockResolvedValueOnce({ access: { token: { id: 'user-token-secret' } } }).mockResolvedValueOnce({
        access: {
          token: { id: 'tenant-token-secret', tenant: { id: 'tid' } },
          serviceCatalog: [{ endpoints: [{ publicURL }] }],
        },
      });

    it('should refuse an http publicURL without allowInsecure and not return the token', async () => {
      mockCatalog('http://store/v1/AUTH_tid');
      const ctx = { ...moduleContext, config: { name: 'main' } };

      await expect(new Auth(ctx).getTenantAuthInfo()).rejects.toThrow(/https/);

      expect(logSave).toHaveBeenCalledWith('openstack-insecure-url-refused', expect.objectContaining({ label: 'publicURL' }));
      expect(JSON.stringify(logSave.mock.calls)).not.toContain('token-secret');
    });

    it('should allow an http publicURL with allowInsecure and log a warning', async () => {
      mockCatalog('http://store/v1/AUTH_tid');

      const info = await new Auth(moduleContext).getTenantAuthInfo();

      expect(info.tenantPublicUrl).toBe('http://store/v1/AUTH_tid');
      expect(logSave).toHaveBeenCalledWith('openstack-server-insecure-http', expect.objectContaining({ label: 'publicURL' }));
    });

    it('should accept an https publicURL without allowInsecure', async () => {
      mockCatalog('https://store/v1/AUTH_tid');
      const ctx = { ...moduleContext, config: { name: 'main' } };

      const info = await new Auth(ctx).getTenantAuthInfo();

      expect(info.tenantPublicUrl).toBe('https://store/v1/AUTH_tid');
    });
  });
});
