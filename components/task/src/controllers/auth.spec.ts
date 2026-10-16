import { AuthController } from './auth';

jest.mock('../models/unit', () => ({ UnitModel: jest.fn() }));

describe('AuthController', () => {
  let client: Record<string, jest.Mock>;
  let controller: AuthController;
  let responseData: jest.SpyInstance;

  beforeEach(() => {
    // Bypass the singleton constructor: it needs the models and the id-api client.
    controller = Object.create(AuthController.prototype);
    client = { getMainUserInfo: jest.fn() };
    controller.idApiClient = client as any;
    (controller as any).config = { auth: { server: 'http://id.local' } };
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    jest.spyOn(controller, 'getRequestUserUnits').mockReturnValue([] as any);
    jest.spyOn(controller, 'transformToBase64WithHash').mockImplementation((data) => data);
  });

  describe('me', () => {
    it('should not prefix an already full avatar URL again', async () => {
      const avaUrl = 'http://id.local:8100/ava/u1.png';
      // The client keeps an already full avatar URL as is.
      client.getMainUserInfo.mockImplementation((user) => ({ ...user }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl }, authUserRoles: ['a'] };

      await controller.me(req, {});

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe(avaUrl);
      expect(data.avaUrl).toBe(avaUrl);
    });

    it('should respond with an empty avatar URL when the user has none', async () => {
      client.getMainUserInfo.mockImplementation((user) => ({ ...user, avaUrl: '' }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl: '' }, authUserRoles: [] };

      await controller.me(req, {});

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe('');
      expect(data.avaUrl).toBe('');
    });
  });

  describe('handleBasicAuthToken', () => {
    // The token that used to be committed to config-templates, built here to keep the literal out of the sources.
    const oldDefaultToken = `Basic ${Buffer.from(['task', 'task'].join(':')).toString('base64')}`;
    const issuedToken = `Basic ${Buffer.from('admin-api:Zk3p9QwLm2Xv8Rt').toString('base64')}`;

    beforeEach(() => {
      (controller as any).config = { basic_auth: { tokens: [issuedToken] } };
      jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
      jest.spyOn(controller as any, 'appendTraceMeta').mockImplementation(() => undefined);
      (global as any).log = { save: jest.fn() };
    });

    it('should reject the old default token', () => {
      const next = jest.fn();

      controller.handleBasicAuthToken(oldDefaultToken.slice(6), {}, {}, next);

      expect(controller.responseError).toHaveBeenCalledWith({}, 'Unknown basic auth token.', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept the configured token', () => {
      const next = jest.fn();
      const req: any = {};

      controller.handleBasicAuthToken(issuedToken.slice(6), req, {}, next);

      expect(req.basicAuthUser).toBe('admin-api');
      expect(next).toHaveBeenCalled();
    });
  });
});
