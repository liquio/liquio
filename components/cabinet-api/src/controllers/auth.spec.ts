import { getIdApiClient } from '@liquio/back-core';

import AuthController from './auth';

jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));
jest.mock('../models/unit', () => jest.fn());
jest.mock('../lib/token', () => jest.fn());

describe('AuthController', () => {
  let client: Record<string, jest.Mock>;
  let controller: AuthController;
  let responseData: jest.SpyInstance;
  let responseError: jest.SpyInstance;

  beforeEach(() => {
    (AuthController as any).singleton = undefined;
    (global as any).config = { auth: {} };
    client = {
      getMainUserInfo: jest.fn(),
      changePassword: jest.fn(),
      generateUserTotp: jest.fn(),
      enableUserTotpSecret: jest.fn(),
      disableUserTotpSecret: jest.fn(),
      deleteUser: jest.fn(),
    };
    (getIdApiClient as jest.Mock).mockReturnValue(client);
    controller = new AuthController();
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    responseError = jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
  });

  describe('me', () => {
    it('should not prefix an already full avatar URL again', async () => {
      const avaUrl = 'http://id.local:8100/ava/u1.png';
      // The client keeps an already full avatar URL as is.
      client.getMainUserInfo.mockImplementation((user) => ({ ...user }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl }, authUserRoles: ['a'] };

      await controller.me(req, {} as any);

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe(avaUrl);
      expect(data.avaUrl).toBe(avaUrl);
    });

    it('should respond with an empty avatar URL when the user has none', async () => {
      client.getMainUserInfo.mockImplementation((user) => ({ ...user, avaUrl: '' }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl: '' }, authUserRoles: [] };

      await controller.me(req, {} as any);

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe('');
      expect(data.avaUrl).toBe('');
    });
  });

  describe('changePassword', () => {
    it('should respond with the client result', async () => {
      client.changePassword.mockResolvedValue({ success: true });
      const req: any = { authUserInfo: { email: 'a@b.c' }, body: { oldPassword: 'o', newPassword: 'n' } };

      await controller.changePassword(req, {} as any);

      expect(client.changePassword).toHaveBeenCalledWith('a@b.c', 'o', 'n');
      expect(responseData).toHaveBeenCalledWith({}, { success: true });
    });
  });

  describe('totp', () => {
    it('should generate the secret for the user', async () => {
      client.generateUserTotp.mockResolvedValue({ success: true, secret: 's' });

      await controller.generateUserTotp({ authUserId: 'u1' } as any, {} as any);

      expect(client.generateUserTotp).toHaveBeenCalledWith('u1');
      expect(responseData).toHaveBeenCalledWith({}, { success: true, secret: 's' });
    });

    it('should enable the secret', async () => {
      client.enableUserTotpSecret.mockResolvedValue({ success: true });

      await controller.enableUserTotpSecret({ authUserId: 'u1', body: { secret: 's', code: 'c' } } as any, {} as any);

      expect(client.enableUserTotpSecret).toHaveBeenCalledWith('u1', 's', 'c');
    });

    it('should disable the secret', async () => {
      client.disableUserTotpSecret.mockResolvedValue({ success: true });

      await controller.disableUserTotpSecret({ authUserId: 'u1', body: { code: 'c' } } as any, {} as any);

      expect(client.disableUserTotpSecret).toHaveBeenCalledWith('u1', 'c');
    });
  });

  describe('deleteUser', () => {
    it('should respond with 400 and the message when deleting is not allowed', async () => {
      client.deleteUser.mockResolvedValue({ success: false, message: 'Method is not allowed' });

      await controller.deleteUser({ authUserId: 'u1' } as any, {} as any);

      expect(responseError).toHaveBeenCalledWith({}, { error: 'Method is not allowed' }, 400);
    });

    it('should respond with the client result on success', async () => {
      client.deleteUser.mockResolvedValue({ success: true });

      await controller.deleteUser({ authUserId: 'u1' } as any, {} as any);

      expect(responseData).toHaveBeenCalledWith({}, { success: true });
    });
  });
});
