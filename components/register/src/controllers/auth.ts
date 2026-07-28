import { NextFunction } from 'express';

import { Request, Response } from '../router';
import Controller from './controller';
import { appendTraceMeta } from '../lib/async_local_storage';
import Log from '../lib/log';

/**
 * Auth controller.
 */
export default class AuthController extends Controller {
  static singleton: AuthController;
  log: Log;

  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: object) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);
      this.log = Log.getInstance();
      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  /**
   * Basic auth.
   */
  basicAuth(req: Request, res: Response, next: NextFunction) {
    // Define params.
    const { token: oldAuthorization, authorization, 'access-info': accessInfoBase64 } = req.headers;
    const token = authorization || oldAuthorization;
    const availableTokens = this.config.auth.tokens;

    // Check token in config.
    const isCorrectToken = availableTokens.includes(token);
    if (!isCorrectToken) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }

    // Check token parts.
    const tokenParts = Array.isArray(token) ? token[0].split(' ') : token.split(' ');
    const [basicKeyword, base64TokenPart] = tokenParts;
    if (basicKeyword !== 'Basic') {
      return this.responseError(res, 'Wrong auth type.', 401);
    }

    // Parse token.
    const parsedTokenParts = Buffer.from(base64TokenPart, 'base64').toString('utf8').split(':');
    if (parsedTokenParts.length !== 2) {
      return this.responseError(res, 'Incorrect basic auth token.', 401);
    }

    // Get user.
    const [user] = parsedTokenParts;
    req.auth = { user };

    // Define access info.
    const accessInfoString =
      accessInfoBase64 && Buffer.from(Array.isArray(accessInfoBase64) ? accessInfoBase64[0] : accessInfoBase64, 'base64').toString('utf8');
    const accessInfo = accessInfoString && JSON.parse(accessInfoString);
    if (typeof accessInfo === 'object' && accessInfo !== null && Object.keys(accessInfo).length > 0) {
      this.log.save('access-info', accessInfo);
      req.accessInfo = accessInfo;

      // Append trace meta.
      appendTraceMeta({ accessInfo });
    }

    const limitedAccess = this.config.auth.limitedAccess || [];
    const userLimitedAccess = limitedAccess.find((v) => v.user === user);

    // Check limited access.
    if (userLimitedAccess) {
      const method = req.method;
      const url = req.url.split('?')[0];
      if (method !== 'GET' || url !== '/records') {
        return this.responseError(res, "Basic auth user don't have access to this URL.", 401, {
          method,
          url
        });
      }
      const userLimitedAccessKeys = userLimitedAccess.keys || [];
      req.auth.userLimitedAccessKeys = userLimitedAccessKeys;
      if (!userLimitedAccessKeys.map((v) => `${v}`).includes(req.query.key_id)) {
        return this.responseError(res, "Basic auth user don't have access to this key.", 401, {
          requestedKey: req.query.key_id,
          userLimitedAccessKeys
        });
      }
    }

    // Check raw filter access.
    if (req.body?.rawSequelizeParams && !this.config.auth?.allowRawSequelizeParamsUsers?.includes(user)) {
      return this.responseError(res, "User doesn't have access to use rawSequelizeParams param.", 400);
    }

    appendTraceMeta({ user });

    // Go next in other cases.
    next();
  }
}
