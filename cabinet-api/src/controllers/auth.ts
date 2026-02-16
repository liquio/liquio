import _ from 'lodash';
import bodyParser from 'body-parser';
import type { Express, Request, Response, NextFunction } from 'express';

import Controller from './controller';
import Auth from '../lib/auth';
import Token from '../lib/token';
import UnitModel from '../models/unit';
import type UnitEntity from '../entities/unit';

// Constants.
const ROLES_SEPARATOR = ';';

/**
 * Auth controller.
 */
class AuthController extends Controller {
  private static singleton: AuthController;
  private auth: any;
  private token: Token;
  private unitModel: UnitModel;

  /**
   * Auth controller constructor.
   */
  constructor() {
    // Define singleton.
    if (!AuthController.singleton) {
      // Call parent constructor.
      super();

      // Auth controller config.
      this.auth = new Auth().provider;
      this.token = new Token((global.config as any).auth);
      this.unitModel = new UnitModel();

      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  initRoutes(app: Express): void {
    app.post('/local/change_password', bodyParser.json(), this.getAuthMiddleware(), this.changePassword.bind(this));

    app.get('/totp/generate', this.getAuthMiddleware(), this.generateUserTotp.bind(this));

    app.post('/totp/enable', this.getAuthMiddleware(), bodyParser.json(), this.enableUserTotpSecret.bind(this));

    app.post('/totp/disable', this.getAuthMiddleware(), bodyParser.json(), this.disableUserTotpSecret.bind(this));

    app.delete('/user', bodyParser.json(), this.getAuthMiddleware(), this.deleteUser.bind(this));
  }

  /**
   * Get auth middleware.
   * @param {boolean} isCheckJwtOnly Is skip ID check, only check JWT
   * @returns {function(req, res, next)} Auth middleware.
   */
  getAuthMiddleware({ isCheckJwtOnly = false } = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    // Return middleware.
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Define params.
      const { token } = req.headers;
      if (!token) {
        return this.responseError(res, 'Token should be defined in request headers.', 401);
      }

      // Get auth access and refresh tokens.
      let authAccessToken: string;
      let authRefreshToken: string;
      try {
        const tokenData = this.token.decrypt(token as string);
        authAccessToken = tokenData.authTokens.accessToken;
        authRefreshToken = tokenData.authTokens.refreshToken;
      } catch (error) {
        return this.responseError(res, error as Error, 401);
      }

      if (isCheckJwtOnly) {
        return next();
      }

      // Append auth access token to request object.
      (req as any).authAccessToken = authAccessToken;

      // Get user info.
      let authUserInfo: any;
      try {
        authUserInfo = await this.auth.getUser(authAccessToken);
      } catch (error) {
        return this.responseError(res, error as Error, 401);
      }

      // Check user info.
      if (!authUserInfo || !authUserInfo.userId) {
        // Try to get new auth access token by refresh token.
        let newAuthTokens: any;
        try {
          newAuthTokens = await this.auth.renewTokens(authRefreshToken);
        } catch (error) {
          return this.responseError(res, error as Error, 401);
        }

        // Append auth access token to request object.
        (req as any).authAccessToken = newAuthTokens.accessToken;

        // Get user info.
        try {
          authUserInfo = await this.auth.getUser(newAuthTokens.accessToken);
        } catch (error) {
          return this.responseError(res, error as Error, 401);
        }

        // Get new token.
        let newToken: string;
        try {
          newToken = this.token.generate({ authTokens: newAuthTokens, authUserInfo });
        } catch (error) {
          return this.responseError(res, error as Error, 401);
        }

        // Add new token to response headers.
        res.header('new_token', newToken);
      }

      // Append auth user info to request object.
      (req as any).authUserInfo = this.auth.getMainUserInfo(authUserInfo, true, true);
      (req as any).authUserId = authUserInfo && authUserInfo.userId;

      // Append userId and name to response object.
      const userId = authUserInfo && authUserInfo.userId;
      const userName = authUserInfo && `${authUserInfo.last_name || ''} ${authUserInfo.first_name || ''} ${authUserInfo.middle_name || ''}`;
      (res as any).responseMeta = (res as any).responseMeta
        ? { ...(res as any).responseMeta, user: { id: userId, name: userName } }
        : { user: { id: userId, name: userName } };

      // Append roles.
      (req as any).authUserRoles = this.getUserRoles(req);

      // Append units.
      (req as any).authUserUnitEntities = await this.getUserUnitEntities((req as any).authUserId);
      (req as any).authUserUnits = this.getUserUnits((req as any).authUserUnitEntities);
      (req as any).separatedAuthUserUnits = this.getSeparatedUserUnits((req as any).authUserUnitEntities);

      // Go next.
      next();
    };
  }

  /**
   * Get check user in one of units.
   * @param {number[]} [units] Needed units.
   * @returns {function(req, res, next)} Middleware function.
   */
  getCheckUserInOneOfUnits(units: number[] = []): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return (req: Request, res: Response, next: NextFunction): any => {
      // Check if no need to verify access.
      if (units.length === 0) {
        return next();
      }

      // Define user units.
      const { authUserUnits = [] } = req as any;

      // Check user without needed units.
      if (authUserUnits.every((au: number) => !units.includes(au))) {
        return this.responseError(res, 'User without needed units.', 401, { needOneOfUnits: units });
      }

      // Go next.
      next();
    };
  }

  /**
   * Get user unit entities.
   * @param {string} userId User ID.
   * @returns {Promise<{head: UnitEntity[], member: UnitEntity[], all: UnitEntity[]}>} Unit info.
   */
  async getUserUnitEntities(userId: string): Promise<{ head: UnitEntity[]; member: UnitEntity[]; all: UnitEntity[] }> {
    const units = await this.unitModel.getAll();

    const defaultUnits = (global.config as any).auth.defaultUnits || [];
    const head = units.filter((v) => v.heads.includes(userId));
    const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id));
    const all = [...new Set([...head, ...member])];

    return { head, member, all };
  }

  /**
   * Get user units.
   * @param {{all, head, member}} authUserUnitEntities Auth user entities.
   * @returns {number[]} Unit info.
   */
  getUserUnits(authUserUnitEntities: { all: UnitEntity[]; head: UnitEntity[]; member: UnitEntity[] }): number[] {
    const { all: allUserUnits } = authUserUnitEntities;
    return allUserUnits.map((v) => v.id);
  }

  /**
   * Get user units.
   * @param {{all, head, member}} authUserUnitEntities Auth user entities.
   * @returns {{head: number[], member: number[], all: number[]}} Unit info.
   */
  getSeparatedUserUnits(authUserUnitEntities: { all: UnitEntity[]; head: UnitEntity[]; member: UnitEntity[] }): {
    head: number[];
    member: number[];
    all: number[];
  } {
    const { head: headUserUnits, member: memberUserUnits, all: allUserUnits } = authUserUnitEntities;
    return {
      head: headUserUnits.map((v) => v.id),
      member: memberUserUnits.map((v) => v.id),
      all: allUserUnits.map((v) => v.id),
    };
  }

  /**
   * Get user roles.
   * @param {object} req HTTP request.
   */
  getUserRoles(req: Request): string[] {
    const authUserInfo = (req as any).authUserInfo;
    return (authUserInfo.role || '').split(ROLES_SEPARATOR).filter((role: string) => role !== '');
  }

  /**
   * Me.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async me(req: Request, res: Response): Promise<void> {
    // Define params.
    const { authUserInfo, authUserRoles } = req as any;
    const authUserUnits = this.getRequestUserUnits(req);

    // Append full ava URL.
    const avaUrl = authUserInfo && authUserInfo.avaUrl;
    const fullAvaUrl = avaUrl && `${(global.config as any).auth.server}${avaUrl}`;
    const userInfo = {
      ...authUserInfo,
      authUserRoles,
      authUserUnits,
      fullAvaUrl,
    };
    const normalizedUserInfo = this.auth.getMainUserInfo(userInfo, true, true);

    // Response.
    const userInfoToResponse = this.convertUnderscoreKeysToCamelCase(normalizedUserInfo);
    this.responseData(res, userInfoToResponse);
  }

  /**
   * Convert Undescore keys to CamelCase.
   * @param {object} data Data object.
   * @returns {object}
   */
  convertUnderscoreKeysToCamelCase(data: any): any {
    const mapKeysDeep = (obj: any, cb: (value: any, key: string) => string): any =>
      _.mapValues(_.mapKeys(obj, cb), (val) => (_.isObject(val) ? mapKeysDeep(val, cb) : val));

    return mapKeysDeep(data, (_value: any, key: string) => {
      return _.camelCase(key);
    });
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const {
        authUserInfo: { email },
      } = req as any;
      const { oldPassword, newPassword } = req.body as any;

      const data = await this.auth.changePassword(email, oldPassword, newPassword);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error as Error);
    }
  }

  async generateUserTotp(req: Request, res: Response): Promise<void> {
    try {
      const { authUserId } = req as any;

      const data = await this.auth.generateUserTotp(authUserId);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error as Error);
    }
  }

  async enableUserTotpSecret(req: Request, res: Response): Promise<void> {
    try {
      const { authUserId } = req as any;
      const { secret, code } = req.body as any;

      const data = await this.auth.enableUserTotpSecret(authUserId, secret, code);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error as Error);
    }
  }

  async disableUserTotpSecret(req: Request, res: Response): Promise<void> {
    try {
      const { authUserId } = req as any;
      const { code } = req.body as any;

      const data = await this.auth.disableUserTotpSecret(authUserId, code);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error as Error);
    }
  }

  /**
   * Delete personal user data.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { authUserId } = req as any;

      const data = await this.auth.deleteUser(authUserId);

      if (data?.success === false) {
        return this.responseError(res, { error: data.message } as any, 400);
      }

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error as Error);
    }
  }
}

export default AuthController;
