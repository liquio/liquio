import crypto from 'crypto';

import {
  AuthorizationCode,
  AuthorizationCodeModel,
  Falsey,
  InvalidRequestError,
  InvalidTokenError,
  Client as OAuthClient,
  OAuthError,
  Token as OAuthToken,
  User as OAuthUser,
  RefreshToken,
  RefreshTokenModel,
} from '@node-oauth/oauth2-server';
import { Log } from '@liquio/back-core';

import { Models } from '../models';
import { AuthCodeAttributes } from '../models/auth_code.model';
import { Services } from '../services';

const PKCE_CHALLENGE_REGEXP = /^[A-Za-z0-9_-]{43}$/;

function isSecretValid(expected: unknown, candidate: unknown): boolean {
  if (typeof expected !== 'string' || !expected || typeof candidate !== 'string' || !candidate) return false;

  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);

  return expectedBuffer.length === candidateBuffer.length && crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

export class OAuthModel implements AuthorizationCodeModel, RefreshTokenModel {
  private readonly log = Log.getInstance();

  async getAccessToken(token: string): Promise<OAuthToken | Falsey> {
    const accessToken: any = await Models.model('accessToken').findOne({
      where: { accessToken: token },
    });
    if (!accessToken) throw new InvalidTokenError('Missing access token');
    return {
      accessToken: accessToken.accessToken,
      accessTokenExpiresAt: accessToken.expires,
      client: { id: accessToken.clientId, grants: accessToken.grants },
      user: { id: accessToken.userId },
      scope: accessToken.scope,
    };
  }

  // `clientSecret === null` is the authorization endpoint lookup of @node-oauth/oauth2-server, where the client is not authenticated.
  async getClient(clientId: string, clientSecret?: string | null): Promise<OAuthClient | Falsey> {
    try {
      if (typeof clientId !== 'string' || !clientId) return false;

      let client: OAuthClient = await Models.model('client')
        .findOne({ where: { clientId } })
        .then((row) => row?.dataValues as unknown as OAuthClient);

      if (!client) return false;
      client.requirements ??= [];
      client.redirectUris = client.redirectUri;
      client.id = client.clientId;
      if (clientSecret !== null && client.need_secret && !isSecretValid(client.secret, clientSecret)) {
        throw new OAuthError('Client secret key is not valid', {
          code: 401,
          errorCode: 401,
        });
      }
      return client;
    } catch (err) {
      this.log.save('get-client-error-async', { error: err }, 'error');
      throw err;
    }
  }

  async saveToken(token: OAuthToken, client: OAuthClient, user: OAuthUser) {
    let promises: Array<Promise<any>> = [];

    promises.push(
      Models.model('accessToken').create({
        accessToken: token.accessToken,
        userId: user.userId ?? user.id ?? user,
        clientId: client.clientId,
        expires: token.accessTokenExpiresAt!,
        scope: token.scope!,
      }),
    );

    if (token.refreshToken) {
      promises.push(
        Models.model('refreshToken').create({
          refreshToken: token.refreshToken,
          userId: user.userId ?? user.id ?? user,
          clientId: client.clientId,
          expires: token.refreshTokenExpiresAt!,
        }),
      );
    }

    return Promise.all(promises).then(() => {
      return {
        ...token,
        client: { id: client.clientId, grants: client.grants },
        user,
      };
    });
  }

  async saveAuthorizationCode(
    authCode: Pick<AuthorizationCode, 'authorizationCode' | 'expiresAt' | 'redirectUri' | 'scope' | 'codeChallenge' | 'codeChallengeMethod'>,
    client: OAuthClient,
    user: OAuthUser,
  ): Promise<AuthorizationCode> {
    if (user == null) {
      throw new OAuthError('User is not defined', {
        code: 400,
        errorCode: 400,
      });
    }
    if (typeof authCode.redirectUri !== 'string' || !authCode.redirectUri.length) {
      throw new InvalidRequestError('Missing authorization code redirect URI');
    }
    if (
      (authCode.codeChallenge !== undefined || authCode.codeChallengeMethod !== undefined) &&
      (typeof authCode.codeChallenge !== 'string' || !PKCE_CHALLENGE_REGEXP.test(authCode.codeChallenge) || authCode.codeChallengeMethod !== 'S256')
    ) {
      throw new InvalidRequestError('Invalid PKCE parameters; use S256');
    }
    const query: AuthCodeAttributes = {
      code: authCode.authorizationCode,
      userId: user.userId ?? user.id ?? user,
      clientId: client.clientId,
      expires: authCode.expiresAt,
      scope: authCode.scope!,
      redirectUri: authCode.redirectUri,
      codeChallenge: authCode.codeChallenge,
      codeChallengeMethod: authCode.codeChallengeMethod,
    };
    return Models.model('authCode')
      .create(query)
      .then(() => {
        this.log.save('authorization-code-created', {
          codeShort: `${query.code.slice(0, 8)}****${query.code.slice(-8)}`,
          codeHash: crypto.createHash('sha256').update(query.code).digest('hex'),
          userId: query.userId,
          expiresAt: query.expires,
        });

        return {
          authorizationCode: authCode.authorizationCode,
          expiresAt: authCode.expiresAt,
          redirectUri: authCode.redirectUri,
          scope: authCode.scope,
          codeChallenge: authCode.codeChallenge,
          codeChallengeMethod: authCode.codeChallengeMethod,
          user,
          client,
        };
      })
      .catch((error) => {
        this.log.save('save-authorization-code-error', { error }, 'error');
        throw error;
      });
  }

  async getAuthorizationCode(authorizationCode: string): Promise<AuthorizationCode | Falsey> {
    const authCode = await Models.model('authCode')
      .findOne({ where: { code: authorizationCode } })
      .then((v) => v?.dataValues as AuthCodeAttributes);

    if (!authCode) {
      const codeShort =
        typeof authorizationCode === 'string' ? `${authorizationCode.slice(0, 8)}****${authorizationCode.slice(-8)}` : String(authorizationCode);

      const codeHash = crypto.createHash('sha256').update(authorizationCode).digest('hex');

      this.log.save('cannot-get-authorization-code', { codeShort, codeHash }, 'error');

      return false;
    }

    // Fail closed: a code without the redirect URI binding (legacy row) or with a malformed PKCE binding cannot be validated.
    if (!authCode.redirectUri) {
      this.log.save(
        'authorization-code-without-redirect-binding',
        { codeHash: crypto.createHash('sha256').update(authorizationCode).digest('hex') },
        'error',
      );
      return false;
    }
    if (
      (authCode.codeChallenge || authCode.codeChallengeMethod) &&
      (!authCode.codeChallenge || !PKCE_CHALLENGE_REGEXP.test(authCode.codeChallenge) || authCode.codeChallengeMethod !== 'S256')
    ) {
      this.log.save(
        'authorization-code-invalid-pkce-binding',
        { codeHash: crypto.createHash('sha256').update(authorizationCode).digest('hex') },
        'error',
      );
      return false;
    }

    return {
      authorizationCode: authCode.code,
      redirectUri: authCode.redirectUri,
      codeChallenge: authCode.codeChallenge ?? undefined,
      codeChallengeMethod: authCode.codeChallengeMethod ?? undefined,
      expiresAt: authCode.expires,
      client: { id: authCode.clientId } as OAuthClient,
      user: { id: authCode.userId },
      scope: authCode.scope,
    };
  }

  async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
    this.log.save('revoke-authorization-code', { codeHash: crypto.createHash('sha256').update(code.authorizationCode).digest('hex') }, 'info');
    const deletedCount = await Models.model('authCode').destroy({ where: { code: code.authorizationCode } });
    return deletedCount > 0;
  }

  async getRefreshToken(refreshToken: string): Promise<RefreshToken | Falsey> {
    try {
      const token = await Models.model('refreshToken')
        .findOne({ where: { refreshToken } })
        .then((token) => token?.dataValues);

      if (!token) return false;

      // A refresh token must not outlive the user's access in the directory.
      if (!(await Services.service('ldapSync').isRefreshAllowed(token.userId))) {
        this.log.save('refresh-token-denied', { userId: token.userId, reason: 'ldap-access-lost' }, 'info');
        return false;
      }

      return {
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.expires,
        client: { id: token.clientId } as any,
        user: { id: token.userId },
      };
    } catch {
      return false;
    }
  }

  async revokeToken(token: RefreshToken): Promise<boolean> {
    return Models.model('refreshToken')
      .destroy({ where: { refreshToken: token.refreshToken } })
      .then(() => true)
      .catch(() => false);
  }
}
