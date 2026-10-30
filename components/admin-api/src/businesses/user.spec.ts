import { IdApiError, getIdApiClient } from '@liquio/back-core';

import { UserBusiness } from './user';

jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));
jest.mock('../services/notifier', () => ({ NotifierService: jest.fn() }));
jest.mock('../lib/test_user_checker', () => ({
  TestUserChecker: jest.fn().mockImplementation(() => ({ isTestUser: jest.fn().mockReturnValue(false) })),
}));

const httpError = (status = 400) => new IdApiError('rejected', { status, body: 'rejected', code: 'HTTP_ERROR' });

describe('UserBusiness', () => {
  let business: UserBusiness;
  let idApiClient: Record<string, jest.Mock>;
  let log: { save: jest.Mock };

  beforeEach(() => {
    (UserBusiness as any).singleton = undefined;
    log = { save: jest.fn() };
    (global as any).log = log;
    (global as any).config = { auth: { clientId: 'admin-api' } };
    (global as any).models = {
      unit: { getAll: jest.fn().mockResolvedValue([{ id: 1, heads: ['u1'], members: ['u1', 'u2'] }]) },
      accessHistory: { save: jest.fn().mockResolvedValue(undefined) },
    };
    idApiClient = {
      getUsersPage: jest.fn(),
      findUserById: jest.fn(),
      updateUserById: jest.fn(),
      logoutByUserId: jest.fn().mockResolvedValue('ok'),
      deleteUser: jest.fn(),
    };
    (getIdApiClient as jest.Mock).mockReturnValue(idApiClient);
    business = new UserBusiness({});
  });

  afterEach(() => {
    delete (global as any).log;
    delete (global as any).config;
    delete (global as any).models;
  });

  describe('getUsers', () => {
    it('should read the total from the response headers and add the units', async () => {
      idApiClient.getUsersPage.mockResolvedValue({ status: 200, headers: { total: '42' }, body: [{ userId: 'u1' }] });

      const result = await business.getUsers({ limit: 20, offset: 0 } as any);

      expect(result.pagination.total).toBe(42);
      expect(result.data[0].units).toEqual({ heads: [1], members: [1], all: [1] });
    });

    it('should return an empty page without users', async () => {
      idApiClient.getUsersPage.mockResolvedValue({ status: 200, headers: { total: '0' }, body: [] });

      await expect(business.getUsers({} as any)).resolves.toEqual({ pagination: { total: 0 }, data: [] });
    });

    it('should throw the id-api error', async () => {
      const error = httpError(500);
      idApiClient.getUsersPage.mockRejectedValue(error);

      await expect(business.getUsers({} as any)).rejects.toBe(error);
    });
  });

  describe('search', () => {
    it('should pass the ids and the brief info flag to the client and find by code', async () => {
      idApiClient.getUsersByIds = jest.fn().mockResolvedValue([{ userId: 'u1' }]);
      idApiClient.getUserByCode = jest.fn().mockResolvedValue({ userId: 'u2' });

      const users = await business.search({ search: undefined, ids: ['u1'], code: '123', briefInfo: true });

      expect(idApiClient.getUsersByIds).toHaveBeenCalledWith(['u1'], { withPrivateProps: false, briefInfo: true });
      expect(idApiClient.getUserByCode).toHaveBeenCalledWith('123');
      expect(users).toHaveLength(2);
    });
  });

  describe('findByUserId', () => {
    it('should add the units to the found user', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u2' });

      const user: any = await business.findByUserId('u2');

      expect(user.units).toEqual({ heads: [], members: [1], all: [1] });
    });

    it('should return undefined (404 in the controller) for an unknown user', async () => {
      idApiClient.findUserById.mockResolvedValue(undefined);

      await expect(business.findByUserId('nope')).resolves.toBeUndefined();
    });
  });

  describe('block', () => {
    it('should update, logout the user and return true', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.block('u1', { userId: 'admin' })).resolves.toBe(true);
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { isActive: false }, { userId: 'admin' });
      expect(idApiClient.logoutByUserId).toHaveBeenCalledWith('u1');
    });

    it('should return false and not logout when id-api rejects the update', async () => {
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.block('u1', {})).resolves.toBe(false);
      expect(idApiClient.logoutByUserId).not.toHaveBeenCalled();
    });

    it('should log and ignore an id-api error response of the logout', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');
      idApiClient.logoutByUserId.mockRejectedValue(new IdApiError('denied', { status: 403, body: 'denied', code: 'HTTP_ERROR' }));

      await expect(business.block('u1', {})).resolves.toBe(true);
      expect(log.save).toHaveBeenCalledWith('id-request-logout-by-user-id-error', { id: 'u1', status: 403, error: 'denied' }, 'error');
    });

    it('should throw a network error of the logout', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');
      idApiClient.logoutByUserId.mockRejectedValue(new IdApiError('down', { code: 'NETWORK_ERROR' }));

      await expect(business.block('u1', {})).rejects.toThrow('down');
      expect(log.save).not.toHaveBeenCalledWith('id-request-logout-by-user-id-error', expect.anything(), 'error');
    });

    it('should rethrow a non id-api error of the logout', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');
      idApiClient.logoutByUserId.mockRejectedValue(new TypeError('bug'));

      await expect(business.block('u1', {})).rejects.toThrow('bug');
    });

    it('should throw a network error', async () => {
      const error = new IdApiError('down', { code: 'NETWORK_ERROR' });
      idApiClient.updateUserById.mockRejectedValue(error);

      await expect(business.block('u1', {})).rejects.toBe(error);
    });
  });

  describe('unblock', () => {
    it('should update, logout the user and return true', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.unblock('u1', {})).resolves.toBe(true);
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { isActive: true }, {});
    });

    it('should return false when id-api rejects the update', async () => {
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.unblock('u1', {})).resolves.toBe(false);
    });
  });

  describe('setAdmin', () => {
    it('should add the admin role and save the access history', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', role: 'user' });
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.setAdmin('u1', { userId: 'admin' })).resolves.toBe(true);
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { role: 'user;admin' }, undefined);
      expect((global as any).models.accessHistory.save).toHaveBeenCalledTimes(1);
    });

    it('should return false when id-api rejects the update', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', role: 'user' });
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.setAdmin('u1', { userId: 'admin' })).resolves.toBe(false);
      expect((global as any).models.accessHistory.save).not.toHaveBeenCalled();
    });
  });

  describe('unsetAdmin', () => {
    it('should remove the admin role and save the access history', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', role: 'user;admin' });
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.unsetAdmin('u1', { userId: 'admin' })).resolves.toBe(true);
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { role: 'user' }, undefined);
    });

    it('should return false when id-api rejects the update', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', role: 'user;admin' });
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.unsetAdmin('u1', { userId: 'admin' })).resolves.toBe(false);
    });
  });

  describe('updateByUserId', () => {
    it('should return true when id-api accepts the update', async () => {
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.updateByUserId('u1', { isActive: true })).resolves.toBe(true);
    });

    it('should return false when id-api rejects the update', async () => {
      idApiClient.updateUserById.mockRejectedValue(httpError(403));

      await expect(business.updateByUserId('u1', { isActive: true })).resolves.toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should return true on success', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', ipn: '123' });
      idApiClient.deleteUser.mockResolvedValue({ success: true });

      await expect(business.deleteUser('u1', '123')).resolves.toBe(true);
    });

    it('should return false when the IPN does not match', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', ipn: '123' });

      await expect(business.deleteUser('u1', '999')).resolves.toBe(false);
      expect(idApiClient.deleteUser).not.toHaveBeenCalled();
    });

    it('should return false when id-api did not delete the user', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', ipn: '123' });
      idApiClient.deleteUser.mockResolvedValue({ success: false });

      await expect(business.deleteUser('u1', '123')).resolves.toBe(false);
    });
  });

  describe('enforce2fa', () => {
    it('should enable 2FA', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1' });
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.enforce2fa('u1')).resolves.toEqual({ success: true });
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { useTwoFactorAuth: true });
    });

    it('should report an error when id-api rejects the update', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1' });
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.enforce2fa('u1')).resolves.toEqual({ error: 'Error enabling 2FA for this user' });
    });
  });

  describe('disable2fa', () => {
    it('should disable 2FA', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', useTwoFactorAuth: true });
      idApiClient.updateUserById.mockResolvedValue('ok');

      await expect(business.disable2fa('u1')).resolves.toEqual({ success: true });
      expect(idApiClient.updateUserById).toHaveBeenCalledWith('u1', { useTwoFactorAuth: false, twoFactorType: null });
    });

    it('should report an error when id-api rejects the update', async () => {
      idApiClient.findUserById.mockResolvedValue({ userId: 'u1', useTwoFactorAuth: true });
      idApiClient.updateUserById.mockRejectedValue(httpError());

      await expect(business.disable2fa('u1')).resolves.toEqual({ error: 'Error disabling 2FA for this user' });
    });
  });
});
