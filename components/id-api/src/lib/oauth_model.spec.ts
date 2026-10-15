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

describe('OAuthModel.getClient', () => {
  let model: OAuthModel;
  let clientModel: any;

  const clientRow = (overrides: Record<string, any> = {}) => ({
    dataValues: {
      clientId: 'client',
      secret: 'topsecret',
      need_secret: true,
      redirectUri: ['https://app.example/cb'],
      grants: ['authorization_code'],
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clientModel = { findOne: jest.fn().mockResolvedValue(clientRow()) };
    (Models.model as jest.Mock).mockReturnValue(clientModel);
    model = new OAuthModel();
  });

  it('rejects an unknown client', async () => {
    clientModel.findOne.mockResolvedValue(null);

    expect(await model.getClient('nope', 'whatever')).toBe(false);
    expect(await model.getClient('nope', null)).toBe(false);
    expect(await model.getClient('nope', undefined)).toBe(false);
  });

  it('rejects a missing client id without a lookup', async () => {
    expect(await model.getClient('', 'topsecret')).toBe(false);
    expect(await model.getClient(undefined as any, 'topsecret')).toBe(false);
    expect(clientModel.findOne).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'wrong', 'topsecre', 'topsecret!'])('rejects a confidential client with the secret %p', async (secret) => {
    await expect(model.getClient('client', secret as any)).rejects.toThrow('Client secret key is not valid');
  });

  it('rejects a confidential client that has no secret configured', async () => {
    clientModel.findOne.mockResolvedValue(clientRow({ secret: null }));

    await expect(model.getClient('client', '')).rejects.toThrow('Client secret key is not valid');
    await expect(model.getClient('client', 'anything')).rejects.toThrow('Client secret key is not valid');
  });

  it('accepts a confidential client with the right secret', async () => {
    expect(await model.getClient('client', 'topsecret')).toMatchObject({
      clientId: 'client',
      id: 'client',
      redirectUris: ['https://app.example/cb'],
    });
  });

  it('compares the secret in constant time', async () => {
    const spy = jest.spyOn(require('crypto'), 'timingSafeEqual');

    await model.getClient('client', 'topsecret');
    await expect(model.getClient('client', 'topsecreT')).rejects.toThrow();
    // Different lengths are rejected before the comparison, which requires equal lengths.
    await expect(model.getClient('client', 'short')).rejects.toThrow();

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('does not check the secret on the authorization endpoint lookup (null)', async () => {
    expect(await model.getClient('client', null)).toMatchObject({ clientId: 'client' });
  });

  it('keeps public clients working without a secret', async () => {
    clientModel.findOne.mockResolvedValue(clientRow({ need_secret: false, secret: null }));

    expect(await model.getClient('client', undefined)).toMatchObject({ clientId: 'client' });
    expect(await model.getClient('client', '')).toMatchObject({ clientId: 'client' });
  });
});

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
