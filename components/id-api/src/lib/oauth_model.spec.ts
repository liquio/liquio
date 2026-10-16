import { Models } from '../models';
import { Services } from '../services';
import { OAuthModel } from './oauth_model';

jest.mock('../models', () => ({
  Models: { model: jest.fn(), db: { transaction: jest.fn((fn: any) => fn({ LOCK: { UPDATE: 'UPDATE' } })) } },
}));
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
      expect.anything(),
    );
    expect(saved).toMatchObject({ redirectUri: REDIRECT, codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' });
  });

  it('saves a code without PKCE', async () => {
    await save();

    expect(authCodeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: REDIRECT, codeChallenge: undefined }),
      expect.anything(),
    );
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

describe('OAuthModel authorization version', () => {
  let model: OAuthModel;
  let userModel: any;
  let tokenModel: any;

  const future = new Date(Date.now() + 60000);
  const tokenRow = (authorizationVersion: number) => ({
    dataValues: {
      accessToken: 'at',
      refreshToken: 'rt',
      code: 'code',
      userId: USER_ID,
      clientId: 'client',
      expires: future,
      redirectUri: 'https://a/cb',
      authorizationVersion,
    },
    ...{ accessToken: 'at', userId: USER_ID, clientId: 'client', expires: future, authorizationVersion },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = { findOne: jest.fn().mockResolvedValue({ dataValues: { authorizationVersion: 2, isActive: true } }) };
    tokenModel = { findOne: jest.fn(), create: jest.fn().mockResolvedValue({}) };
    (Models.model as jest.Mock).mockImplementation((name: string) => (name === 'user' ? userModel : tokenModel));
    (Services.service as jest.Mock).mockReturnValue({ isRefreshAllowed: jest.fn().mockResolvedValue(true) });
    model = new OAuthModel();
  });

  it('accepts an access token of the current authorization version', async () => {
    tokenModel.findOne.mockResolvedValue(tokenRow(2));

    expect(await model.getAccessToken('at')).toMatchObject({ user: { id: USER_ID, authorizationVersion: 2 } });
  });

  it('rejects an access token issued before a password change', async () => {
    tokenModel.findOne.mockResolvedValue(tokenRow(1));

    await expect(model.getAccessToken('at')).rejects.toThrow('revoked');
  });

  it('rejects a refresh token issued before a password change', async () => {
    tokenModel.findOne.mockResolvedValue(tokenRow(1));

    expect(await model.getRefreshToken('rt')).toBe(false);
  });

  it('accepts a refresh token of the current authorization version', async () => {
    tokenModel.findOne.mockResolvedValue(tokenRow(2));

    expect(await model.getRefreshToken('rt')).toMatchObject({ user: { id: USER_ID, authorizationVersion: 2 } });
  });

  it('rejects an authorization code issued before a password change', async () => {
    tokenModel.findOne.mockResolvedValue(tokenRow(1));

    expect(await model.getAuthorizationCode('code')).toBe(false);
  });

  it('refuses to issue tokens for an authorization granted before a password change', async () => {
    await expect(
      model.saveToken(
        { accessToken: 'at2', refreshToken: 'rt2' } as any,
        { clientId: 'client' } as any,
        { id: USER_ID, authorizationVersion: 1 } as any,
      ),
    ).rejects.toThrow('revoked');
    expect(tokenModel.create).not.toHaveBeenCalled();
  });

  it('stamps issued tokens with the current authorization version', async () => {
    await model.saveToken(
      { accessToken: 'at2', refreshToken: 'rt2' } as any,
      { clientId: 'client' } as any,
      { id: USER_ID, authorizationVersion: 2 } as any,
    );

    expect(tokenModel.create).toHaveBeenCalledTimes(2);
    for (const [row] of tokenModel.create.mock.calls) expect(row.authorizationVersion).toBe(2);
  });
});

describe('OAuthModel.revokeToken', () => {
  let model: OAuthModel;
  let refreshTokenModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    refreshTokenModel = { destroy: jest.fn().mockResolvedValue(1) };
    (Models.model as jest.Mock).mockReturnValue(refreshTokenModel);
    model = new OAuthModel();
  });

  it('reports success only when exactly one row was deleted', async () => {
    expect(await model.revokeToken({ refreshToken: 'rt' } as any)).toBe(true);
    expect(refreshTokenModel.destroy).toHaveBeenCalledWith({ where: { refreshToken: 'rt' } });
  });

  it('reports failure when no row was deleted', async () => {
    refreshTokenModel.destroy.mockResolvedValue(0);
    expect(await model.revokeToken({ refreshToken: 'rt' } as any)).toBe(false);
  });

  it('reports failure when the delete fails', async () => {
    refreshTokenModel.destroy.mockRejectedValue(new Error('db down'));
    expect(await model.revokeToken({ refreshToken: 'rt' } as any)).toBe(false);
  });

  it.each([
    ['refresh token', (m: OAuthModel) => m.revokeToken({ refreshToken: 'x' } as any)],
    ['authorization code', (m: OAuthModel) => m.revokeAuthorizationCode({ authorizationCode: 'x' } as any)],
  ])('lets only one of concurrent redemptions of a %s win', async (_name, revoke) => {
    let rows = 1;
    const destroy = jest.fn().mockImplementation(async () => {
      await Promise.resolve();
      const deleted = rows;
      rows = 0;
      return deleted;
    });
    (Models.model as jest.Mock).mockReturnValue({ destroy });

    const results = await Promise.all([revoke(model), revoke(model), revoke(model)]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe('OAuthModel.verifyScope (GI-20)', () => {
  const model = new OAuthModel();

  it('accepts a token carrying every required scope', async () => {
    await expect(model.verifyScope({ scope: ['a', 'b'] } as any, ['a'])).resolves.toBe(true);
    await expect(model.verifyScope({ scope: ['a', 'b'] } as any, ['a', 'b'])).resolves.toBe(true);
  });

  it('rejects a token missing a required scope', async () => {
    await expect(model.verifyScope({ scope: ['a'] } as any, ['a', 'b'])).resolves.toBe(false);
    await expect(model.verifyScope({ scope: [] } as any, ['a'])).resolves.toBe(false);
  });

  it('rejects a token whose scope is not an array', async () => {
    await expect(model.verifyScope({ scope: 'a' } as any, ['a'])).resolves.toBe(false);
    await expect(model.verifyScope({} as any, ['a'])).resolves.toBe(false);
  });
});
