import { Services } from '../services';
import { LdapController } from './ldap.controller';

jest.mock('../middleware/authenticate', () => ({
  AuthMiddleware: { get: jest.fn().mockReturnValue({ basic: jest.fn().mockReturnValue('basic-mw') }) },
}));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, getTraceId: jest.fn() };
});

const GROUP_A = 'CN=LIQUIO-PROD-UNIT-A,OU=Groups,DC=DOMAIN,DC=LOC';
const GROUP_B = 'CN=LIQUIO-PROD-UNIT-B,OU=Groups,DC=DOMAIN,DC=LOC';

describe('LdapController', () => {
  let router: any;
  let controller: LdapController;
  let ldapService: any;
  let res: any;

  const request = (dns: any) => ({ body: { dns } }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { post: jest.fn() };
    ldapService = { isEnabled: true, groupsExist: jest.fn() };
    (Services.service as jest.Mock).mockReturnValue(ldapService);
    controller = new LdapController(router, { config: {} } as any);
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  });

  describe('registerRoutes', () => {
    it('registers POST /ldap/groups/exists behind basic auth', () => {
      (controller as any).registerRoutes();

      expect(router.post).toHaveBeenCalledTimes(1);
      const [path, authMw] = router.post.mock.calls[0];
      expect(path).toBe('/ldap/groups/exists');
      expect(authMw).toBe('basic-mw');
    });
  });

  describe('groupsExist', () => {
    it('responds with the existing group DNs', async () => {
      ldapService.groupsExist.mockResolvedValue([GROUP_A]);

      await controller.groupsExist(request([GROUP_A, GROUP_B]), res);

      expect(ldapService.groupsExist).toHaveBeenCalledWith([GROUP_A, GROUP_B]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ existing: [GROUP_A] });
    });

    it('responds with an empty list when none of the groups exist', async () => {
      ldapService.groupsExist.mockResolvedValue([]);

      await controller.groupsExist(request([GROUP_B]), res);

      expect(res.send).toHaveBeenCalledWith({ existing: [] });
    });

    it('responds with 404 when the ldap provider is disabled', async () => {
      ldapService.isEnabled = false;

      await controller.groupsExist(request([GROUP_A]), res);

      expect(ldapService.groupsExist).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: 'LDAP provider is not enabled.' }));
    });

    it('responds with 503 and a generic message on directory errors', async () => {
      ldapService.groupsExist.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:636'));

      await controller.groupsExist(request([GROUP_A]), res);

      expect(res.status).toHaveBeenCalledWith(503);
      const [payload] = res.send.mock.calls[0];
      expect(payload.message).toBe('Directory is temporarily unavailable.');
      expect(JSON.stringify(payload)).not.toContain('ECONNREFUSED');
    });
  });
});
