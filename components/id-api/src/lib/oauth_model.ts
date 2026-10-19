import crypto from 'crypto';

import {
  AuthorizationCode,
  AuthorizationCodeModel,
  Falsey,
  InvalidGrantError,
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

    // A password mutation bumps the user's authorization version and revokes every older token.
    const user = await Models.model('user')
      .findOne({ where: { userId: accessToken.userId }, attributes: ['authorizationVersion'] })
      .then((v) => v?.dataValues);
    if (!user || (accessToken.authorizationVersion ?? 0) !== (user.authorizationVersion ?? 0)) {
      throw new InvalidTokenError('Authorization has been revoked');
    }

    return {
      accessToken: accessToken.accessToken,
      accessTokenExpiresAt: accessToken.expires,
      client: { id: accessToken.clientId, grants: accessToken.grants },
      user: { id: accessToken.userId, authorizationVersion: accessToken.authorizationVersion ?? 0 },
      scope: accessToken.scope,
    };
  }

  // Route-level minimum scope (`authorise({ scope })`): the token must carry every required scope.
  async verifyScope(token: OAuthToken, requiredScopes: string[]): Promise<boolean> {
    if (!Array.isArray(token.scope)) return false;
    return requiredScopes.every((required) => (token.scope as string[]).includes(required));
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

  /**
   * Run `fn` in a transaction holding a row lock on the user, so that a concurrent password mutation
   * cannot interleave with issuing a credential. Fails when the user's credentials were changed
   * after the authorization that is being exchanged (`user.authorizationVersion`) was granted.
   */
  private async withAuthorizationUser<T>(user: OAuthUser, fn: (transaction: any, version: number) => Promise<T>): Promise<T> {
    const userId = user.userId ?? user.id ?? user;
    return Models.db.transaction(async (transaction) => {
      const account = await Models.model('user').findOne({ where: { userId }, transaction, lock: transaction.LOCK.UPDATE });
      const currentVersion = account?.dataValues.authorizationVersion ?? 0;
      if (!account || (user.authorizationVersion !== undefined && user.authorizationVersion !== currentVersion)) {
        throw new InvalidGrantError('Authorization has been revoked');
      }
      return fn(transaction, currentVersion);
    });
  }

  async saveToken(token: OAuthToken, client: OAuthClient, user: OAuthUser) {
    return this.withAuthorizationUser(user, async (transaction, authorizationVersion) => {
      const userId = user.userId ?? user.id ?? user;
      await Models.model('accessToken').create(
        {
          accessToken: token.accessToken,
          userId,
          clientId: client.clientId,
          expires: token.accessTokenExpiresAt!,
          scope: token.scope!,
          authorizationVersion,
        },
        { transaction },
      );
      if (token.refreshToken) {
        await Models.model('refreshToken').create(
          {
            refreshToken: token.refreshToken,
            userId,
            clientId: client.clientId,
            expires: token.refreshTokenExpiresAt!,
            authorizationVersion,
          },
          { transaction },
        );
      }
      return { ...token, client: { id: client.clientId, grants: client.grants }, user: { ...user, id: userId, authorizationVersion } };
    });
  }

  /**
   * Persist an authorization code stamped with the current authorization version of its user.
   */
  async saveCodeRecord(query: AuthCodeAttributes, user: OAuthUser = { id: query.userId }): Promise<any> {
    return this.withAuthorizationUser(user, async (transaction, authorizationVersion) => {
      query.authorizationVersion = authorizationVersion;
      return Models.model('authCode').create(query, { transaction });
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
    return this.saveCodeRecord(query, user)
      .then(() => {
        this.log.save('authorization-code-created', {
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
      const codeHash = crypto.createHash('sha256').update(authorizationCode).digest('hex');

      this.log.save('cannot-get-authorization-code', { codeHash }, 'error');

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

    const account = await Models.model('user')
      .findOne({ where: { userId: authCode.userId }, attributes: ['authorizationVersion'] })
      .then((v) => v?.dataValues);
    if (!account || (authCode.authorizationVersion ?? 0) !== (account.authorizationVersion ?? 0)) {
      this.log.save('authorization-code-revoked', { codeHash: crypto.createHash('sha256').update(authorizationCode).digest('hex') }, 'info');
      return false;
    }

    return {
      authorizationCode: authCode.code,
      redirectUri: authCode.redirectUri,
      codeChallenge: authCode.codeChallenge ?? undefined,
      codeChallengeMethod: authCode.codeChallengeMethod ?? undefined,
      expiresAt: authCode.expires,
      client: { id: authCode.clientId } as OAuthClient,
      user: { id: authCode.userId, authorizationVersion: authCode.authorizationVersion ?? 0 },
      scope: authCode.scope,
    };
  }

  async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
    this.log.save('revoke-authorization-code', { codeHash: crypto.createHash('sha256').update(code.authorizationCode).digest('hex') }, 'info');
    const deletedCount = await Models.model('authCode').destroy({ where: { code: code.authorizationCode } });
    return deletedCount === 1;
  }

  async getRefreshToken(refreshToken: string): Promise<RefreshToken | Falsey> {
    try {
      const token = await Models.model('refreshToken')
        .findOne({ where: { refreshToken } })
        .then((token) => token?.dataValues);

      if (!token) return false;

      const account = await Models.model('user')
        .findOne({ where: { userId: token.userId }, attributes: ['authorizationVersion'] })
        .then((v) => v?.dataValues);
      if (!account || (token.authorizationVersion ?? 0) !== (account.authorizationVersion ?? 0)) return false;

      // A refresh token must not outlive the user's access in the directory.
      if (!(await Services.service('ldapSync').isRefreshAllowed(token.userId))) {
        this.log.save('refresh-token-denied', { userId: token.userId, reason: 'ldap-access-lost' }, 'info');
        return false;
      }

      return {
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.expires,
        client: { id: token.clientId } as any,
        user: { id: token.userId, authorizationVersion: token.authorizationVersion ?? 0 },
      };
    } catch {
      return false;
    }
  }

  async revokeToken(token: RefreshToken): Promise<boolean> {
    try {
      // The delete is the single-winner step: only the request that actually removed the row may issue replacement tokens.
      const deletedCount = await Models.model('refreshToken').destroy({ where: { refreshToken: token.refreshToken } });
      return deletedCount === 1;
    } catch (error) {
      this.log.save('revoke-refresh-token-error', { error }, 'error');
      return false;
    }
  }
}
