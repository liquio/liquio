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
});
