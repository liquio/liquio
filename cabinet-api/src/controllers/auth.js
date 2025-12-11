const _ = require('lodash');
const bodyParser = require('body-parser');

const Controller = require('./controller');
const Auth = require('../lib/auth');
const Token = require('../lib/token');
const UnitModel = require('../models/unit');

// Constants.
const ROLES_SEPARATOR = ';';

/**
 * Auth controller.
 */
class AuthController extends Controller {
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
      this.token = new Token(global.config.auth);
      this.unitModel = new UnitModel();

      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  initRoutes(app) {
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
  getAuthMiddleware({ isCheckJwtOnly = false } = {}) {
    // Return middleware.
    return async (req, res, next) => {
      // Define params.
      const { token } = req.headers;
      if (!token) {
        return this.responseError(res, 'Token should be defined in request headers.', 401);
      }

      // Get auth access and refresh tokens.
      let authAccessToken;
      let authRefreshToken;
      try {
        const tokenData = this.token.decrypt(token);
        authAccessToken = tokenData.authTokens.accessToken;
        authRefreshToken = tokenData.authTokens.refreshToken;
      } catch (error) {
        return this.responseError(res, error, 401);
      }

      if (isCheckJwtOnly) {
        return next();
      }

      // Append auth access token to request object.
      req.authAccessToken = authAccessToken;

      // Get user info.
      let authUserInfo;
      try {
        authUserInfo = await this.auth.getUser(authAccessToken);
      } catch (error) {
        return this.responseError(res, error, 401);
      }

      // Check user info.
      if (!authUserInfo || !authUserInfo.userId) {
        // Try to get new auth access token by refresh token.
        let newAuthTokens;
        try {
          newAuthTokens = await this.auth.renewTokens(authRefreshToken);
        } catch (error) {
          return this.responseError(res, error, 401);
        }

        // Append auth access token to request object.
        req.authAccessToken = newAuthTokens.accessToken;

        // Get user info.
        try {
          authUserInfo = await this.auth.getUser(newAuthTokens.accessToken);
        } catch (error) {
          return this.responseError(res, error, 401);
        }

        // Get new token.
        let newToken;
        try {
          newToken = this.token.generate({ authTokens: newAuthTokens, authUserInfo });
        } catch (error) {
          return this.responseError(res, error, 401);
        }

        // Add new token to response headers.
        res.header('new_token', newToken);
      }

      // Append auth user info to request object.
      req.authUserInfo = this.auth.getMainUserInfo(authUserInfo, true, true);
      req.authUserId = authUserInfo && authUserInfo.userId;

      // Append userId and name to response object.
      const userId = authUserInfo && authUserInfo.userId;
      const userName = authUserInfo && `${authUserInfo.last_name || ''} ${authUserInfo.first_name || ''} ${authUserInfo.middle_name || ''}`;
      res.responseMeta = res.responseMeta ? { ...res.responseMeta, user: { id: userId, name: userName } } : { user: { id: userId, name: userName } };

      // Append roles.
      req.authUserRoles = this.getUserRoles(req);

      // Append units.
      req.authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
      req.authUserUnits = this.getUserUnits(req.authUserUnitEntities);
      req.separatedAuthUserUnits = this.getSeparatedUserUnits(req.authUserUnitEntities);

      // Go next.
      next();
    };
  }

  /**
   * Get check user in one of units.
   * @param {number[]} [units] Needed units.
   * @returns {function(req, res, next)} Middleware function.
   */
  getCheckUserInOneOfUnits(units = []) {
    return (req, res, next) => {
      // Check if no need to verify access.
      if (units.length === 0) {
        return next();
      }

      // Define user units.
      const { authUserUnits = [] } = req;

      // Check user without needed units.
      if (authUserUnits.every((au) => !units.includes(au))) {
        return this.responseError(res, 'User without needed units.', 401, { needOneOfUnits: units }); // 1000002, 1000000, 1000003, 1000001, 1000004, 1000005
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
  async getUserUnitEntities(userId) {
    const units = await this.unitModel.getAll();

    const defaultUnits = global.config.auth.defaultUnits || [];
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
  getUserUnits(authUserUnitEntities) {
    const { all: allUserUnits } = authUserUnitEntities;
    return allUserUnits.map((v) => v.id);
  }

  /**
   * Get user units.
   * @param {{all, head, member}} authUserUnitEntities Auth user entities.
   * @returns {{head: number[], member: number[], all: number[]}} Unit info.
   */
  getSeparatedUserUnits(authUserUnitEntities) {
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
  getUserRoles(req) {
    const authUserInfo = req.authUserInfo;
    return (authUserInfo.role || '').split(ROLES_SEPARATOR).filter((role) => role !== '');
  }

  /**
   * Me.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async me(req, res) {
    // Define params.
    const { authUserInfo, authUserRoles } = req;
    const authUserUnits = this.getRequestUserUnits(req);

    // Append full ava URL.
    const avaUrl = authUserInfo && authUserInfo.avaUrl;
    const fullAvaUrl = avaUrl && `${global.config.auth.server}${avaUrl}`;
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
  convertUnderscoreKeysToCamelCase(data) {
    const mapKeysDeep = (obj, cb) => _.mapValues(_.mapKeys(obj, cb), (val) => (_.isObject(val) ? mapKeysDeep(val, cb) : val));

    return mapKeysDeep(data, (value, key) => {
      return _.camelCase(key);
    });
  }

  async changePassword(req, res) {
    try {
      const {
        authUserInfo: { email },
      } = req;
      const { oldPassword, newPassword } = req.body;

      const data = await this.auth.changePassword(email, oldPassword, newPassword);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error);
    }
  }

  async generateUserTotp(req, res) {
    try {
      const { authUserId } = req;

      const data = await this.auth.generateUserTotp(authUserId);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error);
    }
  }

  async enableUserTotpSecret(req, res) {
    try {
      const { authUserId } = req;
      const { secret, code } = req.body;

      const data = await this.auth.enableUserTotpSecret(authUserId, secret, code);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error);
    }
  }

  async disableUserTotpSecret(req, res) {
    try {
      const { authUserId } = req;
      const { code } = req.body;

      const data = await this.auth.disableUserTotpSecret(authUserId, code);

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error);
    }
  }

  /**
   * Delete personal user data.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteUser(req, res) {
    try {
      const { authUserId } = req;

      const data = await this.auth.deleteUser(authUserId);

      if (data?.success === false) {
        return this.responseError(res, { error: data.message }, 400);
      }

      this.responseData(res, data);
    } catch (error) {
      this.responseError(res, error);
    }
  }
}

module.exports = AuthController;
