import { Models } from '../models';
import { Services } from '../services';
import { OAuthModel } from './oauth_model';

jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance } };
});

const USER_ID = 'a'.repeat(24);

describe('OAuthModel.getRefreshToken', () => {
  let model: OAuthModel;
  let refreshTokenModel: any;
  let ldapSync: any;

  beforeEach(() => {
    jest.clearAllMocks();

    refreshTokenModel = {
      findOne: jest.fn().mockResolvedValue({ dataValues: { refreshToken: 'rt', expires: new Date(), clientId: 'client', userId: USER_ID } }),
    };
    ldapSync = { isRefreshAllowed: jest.fn().mockResolvedValue(true) };
    (Models.model as jest.Mock).mockReturnValue(refreshTokenModel);
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'ldapSync' ? ldapSync : undefined));

    model = new OAuthModel();
  });

  it('returns the refresh token when the ldap check allows it', async () => {
    const token = await model.getRefreshToken('rt');

    expect(ldapSync.isRefreshAllowed).toHaveBeenCalledWith(USER_ID);
    expect(token).toMatchObject({ refreshToken: 'rt', client: { id: 'client' }, user: { id: USER_ID } });
  });

  it('rejects the refresh when the access is lost', async () => {
    ldapSync.isRefreshAllowed.mockResolvedValue(false);

    expect(await model.getRefreshToken('rt')).toBe(false);
  });

  it('rejects the refresh when the check fails with an unexpected error', async () => {
    ldapSync.isRefreshAllowed.mockRejectedValue(new Error('db down'));

    expect(await model.getRefreshToken('rt')).toBe(false);
  });

  it('does not check anything for an unknown refresh token', async () => {
    refreshTokenModel.findOne.mockResolvedValue(null);

    expect(await model.getRefreshToken('nope')).toBe(false);

    expect(ldapSync.isRefreshAllowed).not.toHaveBeenCalled();
  });
});
