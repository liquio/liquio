import { getIdApiClient } from '@liquio/back-core';

import { Auth } from './authServer';

jest.mock('@liquio/back-core', () => ({ getIdApiClient: jest.fn() }));

const makeClient = () => ({
  getUser: jest.fn(),
  getUsersByIdsRaw: jest.fn(),
  getUsersByCodesRaw: jest.fn(),
});

describe('Auth', () => {
  let client: ReturnType<typeof makeClient>;
  let auth: Auth;

  beforeEach(() => {
    client = makeClient();
    (getIdApiClient as jest.Mock).mockReturnValue(client);
    auth = new Auth();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkToken', () => {
    it('should get the user from id-api and set _id', async () => {
      client.getUser.mockResolvedValue({ userId: 'u1', name: 'A' });

      const user = await auth.checkToken('t1');

      expect(client.getUser).toHaveBeenCalledWith('t1');
      expect(user).toEqual({ userId: 'u1', _id: 'u1', name: 'A' });
    });

    it('should return the cached user on a cache hit', async () => {
      client.getUser.mockResolvedValue({ userId: 'u1' });

      await auth.checkToken('t1');
      const user = await auth.checkToken('t1');

      expect(client.getUser).toHaveBeenCalledTimes(1);
      expect(user._id).toBe('u1');
    });

    it('should request again for another token', async () => {
      client.getUser.mockResolvedValue({ userId: 'u1' });

      await auth.checkToken('t1');
      await auth.checkToken('t2');

      expect(client.getUser).toHaveBeenCalledTimes(2);
    });

    it('should request again when the cached entry is expired', async () => {
      client.getUser.mockResolvedValue({ userId: 'u1' });
      await auth.checkToken('t1');
      auth.cache.t1!.expiredAt = +new Date() - 1;

      await auth.checkToken('t1');

      expect(client.getUser).toHaveBeenCalledTimes(2);
    });

    it('should cache the user for ten minutes', async () => {
      client.getUser.mockResolvedValue({ userId: 'u1' });
      const before = +new Date();

      await auth.checkToken('t1');

      const { expiredAt } = auth.cache.t1!;
      expect(expiredAt).toBeGreaterThanOrEqual(before + 1000 * 60 * 10);
      expect(expiredAt).toBeLessThanOrEqual(+new Date() + 1000 * 60 * 10);
    });

    it('should not cache a user without userId', async () => {
      client.getUser.mockResolvedValue({ name: 'A' });

      const user = await auth.checkToken('t1');

      expect(user).toEqual({ name: 'A' });
      expect(auth.cache.t1).toBeUndefined();
    });

    it('should rethrow the client error and not cache', async () => {
      const error = Object.assign(new Error('{"error":"bad"}'), { status: 401 });
      client.getUser.mockRejectedValue(error);

      await expect(auth.checkToken('t1')).rejects.toBe(error);
      expect(auth.cache.t1).toBeUndefined();
    });
  });

  describe('getUsersInfo', () => {
    it('should call getUsersByIdsRaw with the ids', async () => {
      client.getUsersByIdsRaw.mockResolvedValue([]);

      await auth.getUsersInfo(['u1', 'u2']);

      expect(client.getUsersByIdsRaw).toHaveBeenCalledWith(['u1', 'u2']);
    });

    it('should set _id and strip the password', async () => {
      client.getUsersByIdsRaw.mockResolvedValue([
        { userId: 'u1', password: 'x', phone: '1' },
        { phone: '2', password: 'y' },
      ]);

      const users = await auth.getUsersInfo(['u1']);

      expect(users).toEqual([{ userId: 'u1', _id: 'u1', phone: '1' }, { phone: '2' }]);
    });

    it('should rethrow the client error', async () => {
      const error = new Error('fail');
      client.getUsersByIdsRaw.mockRejectedValue(error);

      await expect(auth.getUsersInfo(['u1'])).rejects.toBe(error);
    });
  });

  describe('getUsersInfoByIpn', () => {
    it('should call getUsersByCodesRaw with the codes', async () => {
      client.getUsersByCodesRaw.mockResolvedValue([]);

      await auth.getUsersInfoByIpn(['123', '456']);

      expect(client.getUsersByCodesRaw).toHaveBeenCalledWith(['123', '456']);
    });

    it('should set _id and strip the password', async () => {
      client.getUsersByCodesRaw.mockResolvedValue([{ userId: 'u1', password: 'x', ipn: '123' }]);

      const users = await auth.getUsersInfoByIpn(['123']);

      expect(users).toEqual([{ userId: 'u1', _id: 'u1', ipn: '123' }]);
    });

    it('should rethrow the client error', async () => {
      const error = new Error('fail');
      client.getUsersByCodesRaw.mockRejectedValue(error);

      await expect(auth.getUsersInfoByIpn(['123'])).rejects.toBe(error);
    });
  });
});
