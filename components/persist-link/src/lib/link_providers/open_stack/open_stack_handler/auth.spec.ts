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
});
