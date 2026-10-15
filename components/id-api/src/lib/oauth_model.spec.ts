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

describe('OAuthModel authorization code binding', () => {
  const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
  const REDIRECT = 'https://app.example/cb';
  let model: OAuthModel;
  let authCodeModel: any;

  const row = (overrides: Record<string, any> = {}) => ({
    dataValues: {
      code: 'code',
      userId: USER_ID,
      clientId: 'client',
      expires: new Date(Date.now() + 60000),
      scope: ['a'],
      redirectUri: REDIRECT,
      codeChallenge: null,
      codeChallengeMethod: null,
      ...overrides,
    },
  });
  const save = (overrides: Record<string, any> = {}) =>
    model.saveAuthorizationCode(
      { authorizationCode: 'code', expiresAt: new Date(), scope: ['a'], redirectUri: REDIRECT, ...overrides } as any,
      { clientId: 'client', redirectUri: ['https://other.example/cb'] } as any,
      { id: USER_ID } as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    authCodeModel = { create: jest.fn().mockResolvedValue({}), findOne: jest.fn().mockResolvedValue(row()), destroy: jest.fn().mockResolvedValue(1) };
    (Models.model as jest.Mock).mockReturnValue(authCodeModel);
    model = new OAuthModel();
  });

  it('persists the request redirect URI and PKCE challenge and returns them, not the client defaults', async () => {
    const saved = await save({ codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' });

    expect(authCodeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: REDIRECT, codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' }),
    );
    expect(saved).toMatchObject({ redirectUri: REDIRECT, codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' });
  });

  it('saves a code without PKCE', async () => {
    await save();

    expect(authCodeModel.create).toHaveBeenCalledWith(expect.objectContaining({ redirectUri: REDIRECT, codeChallenge: undefined }));
  });

  it.each([undefined, ''])('refuses to save a code without a redirect URI %p', async (redirectUri) => {
    await expect(save({ redirectUri })).rejects.toThrow('redirect URI');
    expect(authCodeModel.create).not.toHaveBeenCalled();
  });

  it.each([
    { codeChallenge: CHALLENGE },
    { codeChallengeMethod: 'S256' },
    { codeChallenge: CHALLENGE, codeChallengeMethod: 'plain' },
    { codeChallenge: 'short', codeChallengeMethod: 'S256' },
  ])('refuses to save invalid PKCE parameters %p', async (overrides) => {
    await expect(save(overrides)).rejects.toThrow('PKCE');
    expect(authCodeModel.create).not.toHaveBeenCalled();
  });

  it('loads the persisted bindings', async () => {
    authCodeModel.findOne.mockResolvedValue(row({ codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' }));

    expect(await model.getAuthorizationCode('code')).toMatchObject({
      authorizationCode: 'code',
      redirectUri: REDIRECT,
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      client: { id: 'client' },
      user: { id: USER_ID },
    });
  });

  it('loads a code without PKCE', async () => {
    expect(await model.getAuthorizationCode('code')).toMatchObject({ redirectUri: REDIRECT, codeChallenge: undefined });
  });

  it.each([null, ''])('fails closed for a legacy code without a redirect URI %p', async (redirectUri) => {
    authCodeModel.findOne.mockResolvedValue(row({ redirectUri }));

    expect(await model.getAuthorizationCode('code')).toBe(false);
  });

  it.each([
    { codeChallenge: CHALLENGE, codeChallengeMethod: null },
    { codeChallenge: null, codeChallengeMethod: 'S256' },
    { codeChallenge: CHALLENGE, codeChallengeMethod: 'plain' },
    { codeChallenge: 'short', codeChallengeMethod: 'S256' },
  ])('fails closed for a malformed PKCE binding %p', async (overrides) => {
    authCodeModel.findOne.mockResolvedValue(row(overrides));

    expect(await model.getAuthorizationCode('code')).toBe(false);
  });

  it('revokes by authorization code and reports whether a row was deleted', async () => {
    expect(await model.revokeAuthorizationCode({ authorizationCode: 'code' } as any)).toBe(true);
    expect(authCodeModel.destroy).toHaveBeenCalledWith({ where: { code: 'code' } });

    authCodeModel.destroy.mockResolvedValue(0);
    expect(await model.revokeAuthorizationCode({ authorizationCode: 'code' } as any)).toBe(false);
  });
});
