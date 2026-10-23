import crypto from 'crypto';

import OAuth2Server from '@node-oauth/oauth2-server';

import { Models } from '../models';
import { OAuthModel } from './oauth_model';

jest.mock('../models', () => ({
  Models: {
    model: jest.fn(),
    db: { transaction: jest.fn((callback) => callback({ LOCK: { UPDATE: 'UPDATE' } })) },
  },
}));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));

const redirectUri = 'https://cabinet.example/callback/';
const verifier = 'a'.repeat(43);
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const client = {
  id: 'cabinet',
  clientId: 'cabinet',
  secret: 'secret',
  need_secret: true,
  redirectUri: [redirectUri, 'https://cabinet.example/other/'],
  grants: ['authorization_code'],
};

describe('OAuth authorization code bindings', () => {
  let model: OAuthModel;
  let server: OAuth2Server;
  let rows: Map<string, any>;
  let createToken: jest.Mock;

  beforeEach(() => {
    rows = new Map();
    createToken = jest.fn().mockResolvedValue({});
    (Models.model as jest.Mock).mockImplementation((name) => {
      if (name === 'authCode')
        return {
          create: jest.fn(async (row) => {
            rows.set(row.code, { ...row });
            return row;
          }),
          findOne: jest.fn(async ({ where }) => (rows.has(where.code) ? { dataValues: { ...rows.get(where.code) } } : null)),
          destroy: jest.fn(async ({ where }) => Number(rows.delete(where.code))),
        };
      if (name === 'user') return { findOne: jest.fn(async () => ({ dataValues: { authorizationVersion: 0 } })) };
      if (name === 'client') return { findOne: jest.fn(async () => ({ dataValues: { ...client } })) };
      if (name === 'accessToken' || name === 'refreshToken') return { create: createToken };
      throw new Error(`Unexpected model ${name}`);
    });
    model = new OAuthModel();
    server = new OAuth2Server({ model });
  });

  const issue = (pkce = true) =>
    model.saveAuthorizationCode(
      {
        authorizationCode: 'code',
        expiresAt: new Date(Date.now() + 60000),
        redirectUri,
        scope: ['profile'],
        ...(pkce ? { codeChallenge: challenge, codeChallengeMethod: 'S256' } : {}),
      },
      client,
      { id: 'user' },
    );

  const exchange = (overrides = {}) =>
    server.token(
      new OAuth2Server.Request({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '200' },
        query: {},
        body: {
          grant_type: 'authorization_code',
          client_id: client.id,
          client_secret: client.secret,
          code: 'code',
          redirect_uri: redirectUri,
          code_verifier: verifier,
          ...overrides,
        },
      }),
      new OAuth2Server.Response(),
    );

  it('round-trips the selected callback, scope and S256 bindings', async () => {
    const saved = await issue();
    const bindings = { authorizationCode: 'code', redirectUri, scope: ['profile'], codeChallenge: challenge, codeChallengeMethod: 'S256' };
    expect(saved).toMatchObject(bindings);
    expect(await model.getAuthorizationCode('code')).toMatchObject(bindings);
  });

  it('issues tokens for valid bindings and rejects reuse', async () => {
    await issue();
    expect(await exchange()).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    await expect(exchange()).rejects.toMatchObject({ name: 'invalid_grant' });
    expect(createToken).toHaveBeenCalledTimes(2);
  });

  it.each([
    { code_verifier: undefined },
    { code_verifier: 'b'.repeat(43) },
    { redirect_uri: undefined },
    { redirect_uri: client.redirectUri[1] },
    { redirect_uri: '/' },
  ])('rejects missing or changed bindings: %p', async (overrides) => {
    await issue();
    await expect(exchange(overrides)).rejects.toBeDefined();
    expect(createToken).not.toHaveBeenCalled();
    expect(rows.has('code')).toBe(false);
  });

  it('supports authorization codes without PKCE while enforcing the callback', async () => {
    await issue(false);
    await expect(exchange({ code_verifier: undefined })).resolves.toHaveProperty('accessToken');
  });

  it('allows only one simultaneous exchange', async () => {
    await issue();
    const results = await Promise.allSettled([exchange(), exchange()]);
    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(createToken).toHaveBeenCalledTimes(2);
  });

  it.each([{ clientId: 'other-client' }, { expires: new Date(0) }, { redirectUri: null }])('rejects unusable codes: %p', async (changes) => {
    await issue();
    Object.assign(rows.get('code'), changes);
    await expect(exchange()).rejects.toMatchObject({ name: 'invalid_grant' });
    expect(createToken).not.toHaveBeenCalled();
  });

  it.each([
    { redirectUri: undefined },
    { codeChallenge: challenge },
    { codeChallengeMethod: 'S256' },
    { codeChallenge: challenge, codeChallengeMethod: 'plain' },
    { codeChallenge: 'short', codeChallengeMethod: 'S256' },
  ])('rejects incomplete or unsupported bindings at issuance: %p', async (overrides) => {
    await expect(
      model.saveAuthorizationCode({ authorizationCode: 'code', expiresAt: new Date(), redirectUri, scope: [], ...overrides } as any, client, {
        id: 'user',
      }),
    ).rejects.toMatchObject({ name: 'invalid_request' });
    expect(rows.size).toBe(0);
  });

  it('reports revocation failure when no code row was deleted', async () => {
    expect(await model.revokeAuthorizationCode({ authorizationCode: 'missing' } as any)).toBe(false);
  });
});
