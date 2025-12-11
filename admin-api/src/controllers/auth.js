const _ = require('lodash');

const Controller = require('./controller');
const AuthService = require('../services/auth');
const Token = require('../lib/token');
const { appendTraceMeta } = require('../lib/async_local_storage');
const UnitBusiness = require('../businesses/unit');

// Constants.
const ROLES_SEPARATOR = ';';
const ERROR_MESSAGE_TOKEN_NOT_DEFINED = 'Token should be defined in request headers.';
const ERROR_MESSAGE_WITHOUT_NEEDED_ROLE = 'User without needed role.';
const ERROR_MESSAGE_USER_WITHOUT_ALLOWABLE_UNITS = 'User without allowable units.';
const ERROR_MESSAGE_INCORRECT_SERVER_TOKEN = 'Incorrect server (admin) token.';

/**
 * Auth controller.
 */
class AuthController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);
      this.authService = new AuthService(config.auth);
      this.unitBusiness = new UnitBusiness(config);
      this.token = new Token(config.auth);
      this.serverToken = config.server.token;
      this.access = config.access;
      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  /**
   * Login.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async login(req, res) {
    // Define params.
    const { code } = req.body;

    // Get auth tokens.
    let authTokens;
    try {
      authTokens = await this.authService.getTokens(code);
    } catch (err) {
      return this.responseError(res, err, 401);
    }
    log.save('login-tokens', authTokens);

    // Get user info.
    let authUserInfo;
    try {
      authUserInfo = await this.authService.getUser(authTokens.accessToken);

      await this.setupAdminUnits(authUserInfo);

      const units = await models.unit.getAll();
      for (const unit of units) {
        const headIpn = (unit.headsIpn || []).find((v) => v === authUserInfo.ipn);
        if (headIpn) {
          await models.unit.addHead(unit.id, authUserInfo.userId);
          await models.unit.removeHeadIpn(unit.id, headIpn);

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await models.unit.addHead(baseUnitId, authUserInfo.userId);
          }
        }
        const memberIpn = (unit.membersIpn || []).find((v) => v === authUserInfo.ipn);
        if (memberIpn) {
          await models.unit.addMember(unit.id, authUserInfo.userId);
          await models.unit.removeMemberIpn(unit.id, memberIpn);

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await models.unit.addMember(baseUnitId, authUserInfo.userId);
          }
        }
        const requestedMember = (unit.requestedMembers || []).find((v) => v.ipn === authUserInfo.ipn);
        if (requestedMember) {
          const { firstName: requestedMemberFirstName, middleName: requestedMemberMiddleName, lastName: requestedMemberLastName } = requestedMember;
          const { first_name: userFirstName, middle_name: userMiddleName, last_name: userLastName } = authUserInfo;
          const theSameName =
            `${requestedMemberFirstName}`.toLowerCase() === `${userFirstName}`.toLowerCase() &&
            `${requestedMemberMiddleName}`.toLowerCase() === `${userMiddleName}`.toLowerCase() &&
            `${requestedMemberLastName}`.toLowerCase() === `${userLastName}`.toLowerCase();
          if (theSameName) {
            await models.unit.addMember(unit.id, authUserInfo.userId);
            await models.unit.removeRequestedMember(unit.id, authUserInfo.ipn);

            // Handle base units.
            const { basedOn = [] } = unit || {};
            for (const baseUnitId of basedOn) {
              await models.unit.addMember(baseUnitId, authUserInfo.userId);
            }
          } else {
            await models.unit.removeRequestedMember(unit.id, authUserInfo.ipn);
            await models.unit.addRequestedMember(unit.id, {
              ipn: authUserInfo.ipn,
              firstName: requestedMemberFirstName,
              middleName: requestedMemberMiddleName,
              lastName: requestedMemberLastName,
              wrongUserInfo: true,
            });
          }
        }
      }
    } catch (err) {
      return this.responseError(res, err, 401);
    }
    log.save('login-user-info', authUserInfo);

    // Get token.
    let token;
    try {
      token = this.token.generate({ authTokens, authUserInfo });
    } catch (err) {
      return this.responseError(res, err, 401);
    }

    appendTraceMeta({ userId: authUserInfo?.userId });

    // Response.
    this.responseData(res, { token });
  }

  /**
   * Get check middleware.
   * @param {string[]} [roles] Roles that has access (check by "or"). Noone has access for empty array. Everyone has access for undefined (just try to auth).
   * @param {number[]} units Access for units.
   * @param {boolean} isServiceOnly Flag that auth only from service.
   */
  getCheckMiddleware(roles, units = [], isServiceOnly = false) {
    // Return middleware.
    return async (req, res, next) => {
      // Check if need just try to auth.
      const isJustTry = !Array.isArray(roles) || roles.length === 0;

      if (req.method === 'OPTIONS') {
        return next();
      }
      // Define params.
      const { token } = req.headers;
      if (!token) {
        return isJustTry ? next() : this.responseError(res, ERROR_MESSAGE_TOKEN_NOT_DEFINED, 401);
      }

      // Check server token.
      if (token === this.serverToken) {
        return next();
      }

      // Check case auth from another service.
      if (isServiceOnly) {
        if (token !== this.serverToken) return this.responseError(res, ERROR_MESSAGE_INCORRECT_SERVER_TOKEN, 401);
      }

      // Get auth access and refresh tokens.
      let authAccessToken;
      let authRefreshToken;
      try {
        const tokenData = this.token.decrypt(token);
        authAccessToken = tokenData.authTokens.accessToken;
        authRefreshToken = tokenData.authTokens.refreshToken;
      } catch (err) {
        return isJustTry ? next() : this.responseError(res, err, 401);
      }

      // Append auth access token to request object.
      req.authAccessToken = authAccessToken;

      // Get user info.
      let authUserInfo;
      try {
        authUserInfo = await this.authService.getUser(authAccessToken);
      } catch (err) {
        return isJustTry ? next() : this.responseError(res, err, 401);
      }

      // Check user info.
      if (!authUserInfo || !authUserInfo.userId) {
        // Try to get new auth access token by refresh token.
        let newAuthTokens;
        try {
          newAuthTokens = await this.authService.renewTokens(authRefreshToken);
        } catch (err) {
          return isJustTry ? next() : this.responseError(res, err, 401);
        }

        // Append auth access token to request object.
        req.authAccessToken = newAuthTokens.accessToken;

        // Get user info.
        try {
          authUserInfo = await this.authService.getUser(newAuthTokens.accessToken);
        } catch (err) {
          return isJustTry ? next() : this.responseError(res, err, 401);
        }

        // Get new token.
        let newToken;
        try {
          newToken = this.token.generate({ authTokens: newAuthTokens, authUserInfo });
        } catch (err) {
          return isJustTry ? next() : this.responseError(res, err, 401);
        }

        // Add new token to response headers.
        res.header('new_token', newToken);
      }

      // Append auth user info to request object.
      req.authUserInfo = this.authService.getMainUserInfo(authUserInfo, true, true);
      req.authUserId = authUserInfo && authUserInfo.userId;

      // Append userId and name to response object.
      const userId = authUserInfo && authUserInfo.userId;
      res.responseMeta = res.responseMeta
        ? { ...res.responseMeta, user: { id: userId, name: req.authUserInfo.name } }
        : { user: { id: userId, name: req.authUserInfo.name } };

      // Check role.
      const userRoles = this.getUserRoles(req);

      const hasOneOfNeededRoles = this.hasOneOfNeededRoles(userRoles, roles);
      if (roles && !hasOneOfNeededRoles) {
        log.save('user-without-needed-roles', { authUserInfo, userRoles, neededRoles: roles });
        return this.responseError(res, ERROR_MESSAGE_WITHOUT_NEEDED_ROLE, 403);
      }
      req.authUserRoles = userRoles;

      // Check units.
      const authUserUnitIds = await this.getUserUnitIds(req.authUserId);
      const allowableUnits = this.access?.allowableUnits || [];

      if (Array.isArray(allowableUnits) && allowableUnits.length && !allowableUnits.some((v) => authUserUnitIds.all.includes(v))) {
        log.save('user-without-allowable-units', { authUserUnitIds });
        return this.responseError(res, ERROR_MESSAGE_USER_WITHOUT_ALLOWABLE_UNITS, 403);
      }

      req.authUserUnitIds = authUserUnitIds;

      return this.checkUnitAccess(req, res, next, units);
    };
  }

  /**
   * Check unit access.
   */
  checkUnitAccess(req, res, next, units) {
    if (units.length > 0) {
      if (units.some((v) => req.authUserUnitIds.all.some((unitId) => unitId === v))) {
        return next();
      } else {
        return this.responseError(res, new Error('Access denied.'), 403);
      }
    }

    return next();
  }

  /**
   * Check route path access.
   */
  checkRoutePathAccess(req, res, next) {
    const path = req.route.path;
    const method = _.keys(req.route.methods)[0];

    if (config.access && config.access.paths && config.access.paths[path] && config.access.paths[path][method]) {
      if (config.access.paths[path][method].units.some((v) => req.authUserUnitIds.all.some((unitId) => unitId === v))) {
        return next();
      } else {
        return this.responseError(res, new Error('Access denied.'), 403);
      }
    }

    return next();
  }

  /**
   * Get user roles.
   * @param {object} req HTTP request.
   */
  getUserRoles(req) {
    const authUserInfo = req.authUserInfo;
    const roles = (authUserInfo.role || '').split(ROLES_SEPARATOR).filter((role) => role !== '');
    return roles;
  }

  /**
   * Get user unit ids.
   * @param {string} userId User ID.
   * @returns {Promise<{head: UnitEntity[], member: UnitEntity[], all: UnitEntity[]}>} Unit info.
   */
  async getUserUnitIds(userId) {
    const units = await models.unit.getAll();
    const head = units.filter((v) => v.heads.includes(userId));
    const member = units.filter((v) => v.members.includes(userId));
    const all = [...new Set([...head, ...member])];

    return {
      head: head.map((v) => v.id),
      member: member.map((v) => v.id),
      all: all.map((v) => v.id),
    };
  }

  /**
   * Has one of roles.
   * @param {string[]} existingRoles Existing roles.
   * @param {string[]} neededRoles Needed roles.
   */
  hasOneOfNeededRoles(existingRoles = [], neededRoles = []) {
    const hasOneOfNeededRoles = existingRoles.some((existing) => neededRoles.includes(existing));
    return hasOneOfNeededRoles;
  }

  /**
   * Me.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async me(req, res) {
    // Define params.
    const { authUserInfo, authUserRoles, authUserUnitIds } = req;

    // Append full ava URL.
    const avaUrl = authUserInfo && authUserInfo.avaUrl;
    const fullAvaUrl = avaUrl && `${this.config.auth.server}${avaUrl}`;
    const userInfo = { ...authUserInfo, authUserRoles, authUserUnitIds, fullAvaUrl };
    const normalizedUserInfo = this.authService.getMainUserInfo(userInfo, true, true);

    // Response.
    this.responseData(res, this.convertUnderscoreKeysToCamelCase(normalizedUserInfo));
  }

  /**
   * Change user password.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async changePassword(req, res) {
    // Define params.
    const { oldPassword, newPassword } = req.body;
    const authUserInfo = req.authUserInfo;

    // Validate input.
    if (!oldPassword || !newPassword) {
      return this.responseError(res, 'Old and new passwords are required.', 400);
    }

    // Change password.
    try {
      await this.authService.changePassword(authUserInfo.email, oldPassword, newPassword);
      this.responseData(res, { message: 'Password changed successfully.' });
    } catch (err) {
      return this.responseError(res, err, 500);
    }
  }

  /**
   * Special case for clean database state when the first user to login should be set up as a head of the admin units.
   * @private
   * @param {object} userInfo
   */
  async setupAdminUnits(userInfo) {
    try {
      // Refer to `admin` configuration block to check for setup requirements.
      if (this.config.user.shouldSetupAdmin && this.config.user.adminUnitId) {
        log.save('setup-admin-units', { userInfo });

        const { adminUnitId } = this.config.user;

        // Fetch all units from the database
        const units = await this.unitBusiness.getAll({
          filters: { ids_in: adminUnitId },
        });

        // Make sure that all selected admin units are empty
        const isAllAdminUnitsEmpty = units.every((unit) => !unit.members.length && !unit.heads.length);

        // If all selected admin units are empty, add the current user as a member and head
        if (isAllAdminUnitsEmpty) {
          for (const unitId of adminUnitId) {
            await this.unitBusiness.addHeads({ id: unitId, heads: [userInfo.userId], currentUser: userInfo, isForce: true });
            await this.unitBusiness.addMembers({ id: unitId, members: [userInfo.userId], currentUser: userInfo, isForce: true });
          }

          // Add admin role to the user
          const existingRoles = userInfo.role.split(';');
          const preparedRoles = existingRoles
            .filter((role) => role !== 'admin')
            .concat('admin')
            .join(';');
          await this.authService.updateByUserId(userInfo.userId, { role: preparedRoles }, userInfo.userId);
        }
      }
    } catch (error) {
      // Report the error and skip the setup
      log.save('setup-admin-units-error', { error: error.message, stack: error.stack }, 'error');
    }
  }
}

module.exports = AuthController;
