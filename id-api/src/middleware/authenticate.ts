import OAuth2Server, { OAuthError } from '@node-oauth/oauth2-server';
import crypto from 'crypto';
import { matchedData, query } from 'express-validator';

import { Config, DEFAULT_COOKIE_DOMAIN } from '../config';
import { generatePinCode } from '../lib/helpers';
import { Log } from '../lib/log';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { Models, UserAttributes } from '../models';
import { Services } from '../services';
import { getStrategy, govid } from '../strategies/govid';
import { local } from '../strategies/local';
import { wso2 } from '../strategies/wso2';
import { x509 } from '../strategies/x509';
import { Express, NextFunction, Request, Response } from '../types';
import { appendTraceMeta } from './async_local_storage';
import { destroySession, saveSession } from './session';

export class AuthMiddleware {
  private static singleton: AuthMiddleware;

  private readonly log = Log.get();
  private readonly secretKey!: string;
  private readonly credentials!: {
    username: string;
    password: string;
    realm: string;
    realmHash: string;
  };
  private readonly config: Config;
  private readonly service = Services.service.bind(Services);

  constructor(private readonly express: Express) {
    if (AuthMiddleware.singleton) {
      throw new Error('AuthMiddleware already initialized.');
    }

    this.config = express.config;

    const secretKey = this.express.config.oauth?.secret_key;
    if (!secretKey) {
      throw new Error('No secret key provided for OAuth authentication');
    }
    this.secretKey = secretKey![0];

    const [username, password] = Buffer.from(this.secretKey, 'base64').toString().trim().split(':');

    const realm = 'Digest Authentication';
    this.credentials = {
      username,
      password,
      realm,
      realmHash: cryptoUsingMD5(realm),
    };

    // Logout user.
    express.get('/logout', query('redirect_uri').optional().default('/').isString(), this.logout());

    AuthMiddleware.singleton = this;
  }

  static get() {
    if (!AuthMiddleware.singleton) {
      throw new Error('AuthMiddleware not initialized. Please call AuthMiddleware.init() first.');
    }
    return AuthMiddleware.singleton;
  }

  async init() {
    const app = this.express;
    const config = app.config.auth_providers;

    if (!config) {
      throw new Error('No authentication providers configured');
    }

    const promises = [];
    if (config.govid) promises.push(govid(app));
    if (config.local?.isEnabled) promises.push(local(app));
    if (config.wso2?.isEnabled) promises.push(wso2(app));
    if (config.x509?.isEnabled) promises.push(x509(app));
    await Promise.all(promises);
  }

  basic() {
    // Define inner secrets.
    const hashedInnerSecret = this.secretKey;
    const hashedInnerSecrets = Array.isArray(hashedInnerSecret) ? hashedInnerSecret : [hashedInnerSecret];
    const innerSecrets = hashedInnerSecrets.map((v) => Buffer.from(v, 'base64').toString().trim());

    return (req: Request, res: Response, next: NextFunction): void => {
      // Define params.
      const authorization = req.headers.authorization ?? '';
      const [, token] = authorization.split('Basic ');

      // Check credentials.
      if (token) {
        // Define incoming secret.
        const incomingSecret = Buffer.from(token, 'base64').toString().trim();

        try {
          const [username] = incomingSecret.split(':');
          appendTraceMeta({ auth: 'basic', username });
        } catch {
          // Ignore error if not valid Basic auth token.
        }

        // Check incoming secret.
        if (innerSecrets.includes(incomingSecret)) {
          return next();
        }
      }

      // Response auth error.
      res.status(401).send('unauthorize');
    };
  }

  authorise() {
    const service = this.service('auth');

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const request = new OAuth2Server.Request(req);
        const response = new OAuth2Server.Response(res);
        const token = await service.server.authenticate(request, response);
        req.user = token.user as any;
        res.locals.oauth = { token };
        const passport = req.session.passport ?? ({} as any);
        const user = await service.getUser({ userId: token.user.id });
        req.session.passport = passport;
        appendTraceMeta({ auth: 'authorise', userId: user.userId });
        await saveSession(req, user);
        return next();
      } catch (error: any) {
        this.log.save('oauth-authenticate', { error: error.message, stack: error.stack }, 'error');
        res.status(error.statusCode).send(new OAuthError(error.message, error));
      }
    };
  }

  private async onLogout(req: Request, res: Response) {
    const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'logout' });

    let { redirect_uri: redirectUri } = matchedData(req, { locations: ['query'] });

    try {
      await destroySession(req);
    } catch (error: any) {
      this.log.save('logout-error', { error: error?.message ?? error.toString() }, 'error');
    }

    // Save to login_history as logout.
    if (loginHistoryData) {
      await Models.model('loginHistory').create(loginHistoryData);
    }
    // Redirect to `/` if custom redirect not defined.
    if (!req.query.redirect_uri) {
      return res.redirect('/');
    }

    await Models.model('client')
      .findAll()
      .then((rows) => rows.map((row) => row.dataValues))
      .then((clients) => {
        const clientsRedirectUri: string[] = clients.map((v) => v.redirectUri).reduce((t, v) => [...t, ...v], []);

        const isAllowedRedirectUri = clientsRedirectUri.some((v) => redirectUri.startsWith(v));
        if (!isAllowedRedirectUri) {
          redirectUri = '/';
        }

        res.redirect(redirectUri);
      });
  }

  logout(): (req: Request, res: Response, next: NextFunction) => Promise<void> | void {
    return async (req: Request, res: Response) => {
      let { passport } = req.session;

      if (passport && 'user' in passport) {
        let { user } = passport,
          { userId, provider } = user;

        const redis = this.service('redis');
        if (redis.isEnabled && userId) {
          const tokens = await Models.model('accessToken')
            .findAll({ where: { userId } })
            .then((rows) => rows.map((row) => row.dataValues));

          this.log.save('delete-user-info-cache', { userId, tokens: tokens.length }, 'info');

          tokens.forEach(({ accessToken }) => {
            const sha1AccessToken = crypto.createHash('sha1').update(accessToken).digest('hex');
            redis.delete(`token.${sha1AccessToken}`);
          });
        }

        await Models.model('accessToken').destroy({ where: { userId } });
        await Models.model('refreshToken').destroy({ where: { userId } });
        await Models.model('sessions').destroy({ where: { userId: userId } });

        if (provider === 'govid') {
          try {
            await getStrategy().logout(user.services[provider]);
          } catch (error: any) {
            this.log.save('logout-error', { error: error?.message ?? error.toString() }, 'error');
          }
        }
      }

      res.clearCookie('jwt', { domain: this.express.config.domain ?? DEFAULT_COOKIE_DOMAIN });
      req.logout(() => this.onLogout(req, res));
    };
  }

  checkUserAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.session?.passport?.user;
      const { isActive, userId } = user ?? {};
      const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'login' });

      if (!this.checkIdentificationType(user)) {
        this.log.save('get-auth|user-identification-type-not-allowed', { userId, userIdentificationType: user.userIdentificationType }, 'warn');

        if (loginHistoryData) {
          await this.service('auth').destroySession(userId, loginHistoryData);
        }

        res.status(403).send({ error: { message: 'User identification type is not allowed.' } });
        return;
      }

      // If EDRPOU and/or RNOKPP whitelists are enabled, make sure that the user matches at least one of the criteria
      if (!this.checkEdrpouWhitelist(user) && !this.checkRnokppWhitelist(user)) {
        this.log.save('get-auth|user-edrpou-or-rnokpp-not-allowed', { userId, edrpou: user.edrpou, rnokpp: user.ipn }, 'warn');

        if (loginHistoryData) {
          await this.service('auth').destroySession(userId, loginHistoryData);
        }

        res.status(403).send({ error: { message: 'User EDRPOU is not allowed.' } });
        return;
      }

      if (isActive === false) {
        if (loginHistoryData) {
          await this.service('auth').destroySession(userId, loginHistoryData);
        }

        res.status(403).send({ error: { message: 'User has been blocked.' } });
        return;
      }

      // If LDAP is enabled and user is identified
      if (this.service('ldap').isEnabled && user) {
        // Append authentication data to user session and check if it's passed
        const isPassed = await this.service('auth').authenticateLdap(user);

        // If LDAP authentication is required and the user already passed onboarding,
        // deny access if LDAP check is failed
        if (this.service('ldap').isRequired && !user.needOnboarding && !isPassed) {
          this.log.save('ldap-authentication-failed', { userId }, 'warn');
          res.status(403).send({ error: { message: 'LDAP authentication failed.' } });
          return;
        }
      }

      next();
    };
  }

  checkConfigAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (this.login(req, res)) next();
    };
  }

  /**
   * Ensure that user uses allowed identification type.
   */
  private checkIdentificationType(user: UserAttributes): boolean {
    // Skip check if not configured
    if (!Array.isArray(this.config.allowIdentificationTypes)) {
      return true;
    }

    // Skip check if user is not authenticated and identified
    if (!user?.userIdentificationType) {
      return true;
    }

    return this.config.allowIdentificationTypes.includes(user.userIdentificationType);
  }

  /**
   * Ensure that user belongs to a whitelisted organization.
   */
  private checkEdrpouWhitelist(user: UserAttributes): boolean {
    // Skip check if not configured
    if (!Array.isArray(this.config.allowEdrpou)) {
      return true;
    }

    // Skip check if user is not authenticated and identified
    if (!user?.userIdentificationType) {
      return true;
    }

    return this.config.allowEdrpou.includes(user.edrpou!);
  }

  /**
   * Ensure that user belongs to a whitelisted RNOKPP.
   */
  private checkRnokppWhitelist(user: UserAttributes): boolean {
    // Skip check if not configured
    if (!Array.isArray(this.config.allowRnokpp)) {
      return true;
    }

    // Skip check if user is not authenticated and identified
    if (!user?.userIdentificationType) {
      return true;
    }

    return this.config.allowRnokpp.includes(user.ipn!);
  }

  private applyRealmHeader(res: Response) {
    res.header(
      'WWW-Authenticate',
      `Digest realm="${this.credentials.realm}",qop="auth",nonce="${generatePinCode(16)}",opaque="${this.credentials.realmHash}"`,
    );
  }

  /**
   * Handles the login process for Digest authentication.
   */
  private login(req: Request, res: Response) {
    if (!req.headers.authorization) {
      this.applyRealmHeader(res);
      return sendAuthError(res);
    }

    const authInfo = parseAuthenticationInfo(req.headers.authorization.replace(/^Digest /, ''));

    if (authInfo.username !== this.credentials.username) {
      this.applyRealmHeader(res);
      return sendAuthError(res, undefined, 'Not valid login');
    }

    const digestAuthObject: Record<string, any> = {};

    digestAuthObject.ha1 = cryptoUsingMD5(authInfo.username + ':' + this.credentials.realm + ':' + this.credentials.password);

    digestAuthObject.ha2 = cryptoUsingMD5(req.method + ':' + authInfo.uri);

    let response = cryptoUsingMD5([digestAuthObject.ha1, authInfo.nonce, authInfo.nc, authInfo.cnonce, authInfo.qop, digestAuthObject.ha2].join(':'));

    digestAuthObject.response = response;

    if (authInfo.response !== digestAuthObject.response) {
      this.applyRealmHeader(res);
      return sendAuthError(res, undefined, 'Not valid password');
    }

    return true;
  }
}

function sendAuthError(res: Response, code = 'Authorization error', message = 'Authorization empty') {
  res.status(401).send({ code, message });
}

function cryptoUsingMD5(data: string) {
  return crypto.createHash('md5').update(data).digest('hex');
}

interface AuthInfo {
  username: string;
  nonce: string;
  nc: string;
  cnonce: string;
  qop: string;
  response: string;
  uri: string;
}

function parseAuthenticationInfo(authData: string): AuthInfo {
  let authenticationObj: Record<string, any> = {};

  authData.split(', ').forEach((pair: string) => {
    const [key, value] = pair.split('=');
    authenticationObj[key] = value.replace(/"/g, '');
  });

  return authenticationObj as AuthInfo;
}
