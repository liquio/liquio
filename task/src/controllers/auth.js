
const crypto = require('crypto');
const Controller = require('./controller');
const Auth = require('../services/auth');
const LdapClient = require('../services/ldap');
const Token = require('../lib/token');
const UserAccess = require('../lib/user_access');
const UnitModel = require('../models/unit');
const TaskModel = require('../models/task');
const WorkflowModel = require('../models/workflow');
const { GROUPS: ROUTE_GROUPS } = require('../services/router/routes');
const OnboardingController = require('./onboarding');

// Constants.
const ROLES_SEPARATOR = ';';
const ERROR_MESSAGE_TOKEN_NOT_DEFINED = 'Token should be defined in request headers.';
const ERROR_MESSAGE_WITHOUT_NEEDED_ROLE = 'User without needed role.';
const ERROR_MESSAGE_DEBUG_USER_NOT_ALLOWED = 'User without needed unit to debug other user.';
const ERROR_MESSAGE_DEBUG_USER_NOT_FOUND = 'Debug user not found.';
const ERROR_MESSAGE_RESTRICTED_UNIT = 'forbidden';
const ERROR_MESSAGE_LDAP_UNAUTHORIZED = 'Unauthorized by LDAP';

/**
 * Auth controller.
 */
class AuthController extends Controller {
  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);

      // Auth controller config.
      this.auth = new Auth().provider;
      this.token = new Token(config.auth);
      this.access = config.access;
      this.userAccess = new UserAccess();
      this.unitModel = new UnitModel();
      this.taskModel = new TaskModel();
      this.workflowModel = new WorkflowModel();
      this.onboardingController = new OnboardingController(config);

      // Caching config.
      this.caching = config.auth.caching;

      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  static getInstance() {
    return AuthController.singleton;
  }

  /**
   * Login.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async login(req, res) {
    // Check if test auth turned on.
    if (this.config.auth.useTestAuth) {
      return this.testLogin(req, res);
    }

    log.save('auth-login-start');

    // Define params.
    const { code } = req.body;

    // Get auth tokens.
    let authTokens;
    try {
      authTokens = await this.auth.getTokens(code);
    } catch (err) {
      log.save('auth-login-error|cannot-get-tokens', {
        error: err.message,
        codeShort: typeof code === 'string' ? `${code.slice(0, 8)}****${code.slice(-8)}` : String(code),
        codeHash: crypto.createHash('sha256').update(code).digest('hex'),
      }, 'error');
      return this.responseError(res, err, 401);
    }
    log.save('auth-login-tokens', authTokens);
    const { accessToken, refreshToken } = authTokens;

    // Get user info.
    let authUserInfo;
    try {
      authUserInfo = await this.auth.getUser(authTokens.accessToken);
      const userName = `${authUserInfo.last_name || ''} ${authUserInfo.first_name || ''} ${authUserInfo.middle_name || ''}`.trim();

      if (this.config.auth.ldap?.isEnabled) {
        await this.#processLDAPUnits(authUserInfo);
      }

      // Handle units.
      const units = await this.unitModel.getAll();
      let unitsUpdated = false;
      for (const unit of units) {
        const headIpn = (unit.headsIpn || []).find(v => v === authUserInfo.ipn);
        if (headIpn) {
          unitsUpdated = true;
          await this.unitModel.addHead(unit.id, authUserInfo.userId);
          await this.unitModel.removeHeadIpn(unit.id, headIpn);

          // Save to access history.
          await models.accessHistory.update(unit.id, headIpn, 'added-to-head-unit', {
            userId: authUserInfo.userId,
            userName: userName
          });

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await this.unitModel.addHead(baseUnitId, authUserInfo.userId);

            // Save to access history.
            await models.accessHistory.update(baseUnitId, headIpn, 'added-to-head-unit', {
              userId: authUserInfo.userId,
              userName: userName
            });
          }
        }
        const memberIpn = (unit.membersIpn || []).find(v => v === authUserInfo.ipn);
        if (memberIpn) {
          unitsUpdated = true;
          await this.unitModel.addMember(unit.id, authUserInfo.userId);
          await this.unitModel.removeMemberIpn(unit.id, memberIpn);

          // Save to access history.
          await models.accessHistory.update(unit.id, memberIpn, 'added-to-member-unit', {
            userId: authUserInfo.userId,
            userName: userName
          });

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await this.unitModel.addMember(baseUnitId, authUserInfo.userId);

            // Save to access history.
            await models.accessHistory.update(baseUnitId, memberIpn, 'added-to-member-unit', {
              userId: authUserInfo.userId,
              userName: userName
            });
          }
        }
        const requestedMember = (unit.requestedMembers || []).find(v => v.ipn === authUserInfo.ipn);
        if (requestedMember) {
          unitsUpdated = true;
          const { firstName: requestedMemberFirstName, middleName: requestedMemberMiddleName, lastName: requestedMemberLastName } = requestedMember;
          const { first_name: userFirstName, middle_name: userMiddleName, last_name: userLastName } = authUserInfo;
          const theSameName = `${requestedMemberFirstName}`.toLowerCase() === `${userFirstName}`.toLowerCase()
            && (`${requestedMemberMiddleName}`.toLowerCase() === `${userMiddleName}`.toLowerCase() || !requestedMemberMiddleName)
            && `${requestedMemberLastName}`.toLowerCase() === `${userLastName}`.toLowerCase();
          if (theSameName) {
            await this.unitModel.addMember(unit.id, authUserInfo.userId);
            await this.unitModel.removeRequestedMember(unit.id, authUserInfo.ipn);

            // Handle base units.
            const { basedOn = [] } = unit || {};
            for (const baseUnitId of basedOn) {
              await this.unitModel.addMember(baseUnitId, authUserInfo.userId);
            }
          } else {
            await this.unitModel.removeRequestedMember(unit.id, authUserInfo.ipn);
            await this.unitModel.addRequestedMember(unit.id, {
              ipn: authUserInfo.ipn,
              firstName: requestedMemberFirstName,
              middleName: requestedMemberMiddleName,
              lastName: requestedMemberLastName,
              wrongUserInfo: true
            });
          }
        }
      }

      // Update units cache.
      if (unitsUpdated) {
        await this.unitModel.getAll();
      }

      // Handle tasks where the user is a performer.
      await this.taskModel.addPerformerUserByIpnOrEmail(
        authUserInfo.ipn,
        authUserInfo.email,
        authUserInfo.userId,
        userName,
      );

      // Handle workflows.
      await this.workflowModel.updateCreatedBy(authUserInfo.ipn, authUserInfo.userId);
    } catch (error) {
      log.save('auth-login-error|cannot-process-auth-user-info', { error: error?.message, details: error?.details }, 'error');
      return this.responseError(res, error, 401);
    }
    log.save('auth-login-user-info', authUserInfo);

    // Get token.
    let token;
    try {
      token = this.token.generate({ authTokens, authUserInfo });
    } catch (err) {
      log.save('auth-login-error|cannot-generate-token', { error: err?.message, details: err?.details }, 'error');
      return this.responseError(res, err, 401);
    }

    const userId = authUserInfo && authUserInfo.userId;
    // Logout other sessions.
    const needLogoutOtherSessions = !this.config.auth.doNotLogoutOtherSessions;
    if (needLogoutOtherSessions) {
      try {
        this.auth.logoutOtherSessions(userId, accessToken, refreshToken);
      } catch (error) {
        log.save('logout-other-sessions-error', { error, needLogoutOtherSessions }, 'warn');
      }
    }

    try {
      if (global.redisClient) {
        const tokenData = this.token.decrypt(token);
        const authAccessToken = tokenData.authTokens.accessToken;
        const sha1AccessToken = this.getSha1Hash(authAccessToken);
        await global.redisClient.delete(`token.${sha1AccessToken}`);
      }
    } catch (error) {
      log.save('auth-login-error|cannot-delete-cached-user-data', { error: error.toString() }, 'error');
      return this.responseError(res, `Cannot delete cached user data: ${error.toString()}`, 500);
    }
    try {
      await businesses.task.deleteExpiredDraftsByUserId(userId);
    } catch (error) {
      log.save('delete-expired-drafts-by-user-id|delete-while-login-error', { userId, error: error?.message || error });
    }

    // Response.
    log.save('auth-login-success', { userId });
    this.responseData(res, { token });
  }

  /**
   * Test login.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  testLogin(req, res) {
    // Define params.
    const { code } = req.body;

    // Find needed test auth object.
    const testAuth = this.config.test_users?.list?.find(v => v.code === code);
    if (!testAuth) {
      return this.responseError(res, 'Wrong test auth code.', 401);
    }

    this.responseData(res, { token: testAuth.jwtToken });
  }

  /**
   * Get check middleware.
   * @param {string[]} [roles] Roles that has access (check by "or"). Noone has access for empty array. Everyone has access for undefined (just try to auth).
   * @param {string[]} [groups] Route groups.
   */
  getCheckMiddleware(roles, groups = []) {
    // Return middleware.
    return async (req, res, next) => {
      // Check if need just try to auth.
      const isJustTry = !Array.isArray(roles) || roles.length === 0;

      // Define params.
      const { token, 'debug-user-id': debugUserId } = req.headers;
      if (!token) {
        return isJustTry ? next() : this.responseError(res, ERROR_MESSAGE_TOKEN_NOT_DEFINED, 401);
      }

      if (this.isAuthCouldBeMock(token)) {
        await this.fakeAuth(req, token);
        return next();
      }

      // Get auth access and refresh tokens.
      let tokenData;
      let authAccessToken;
      let authRefreshToken;
      try {
        tokenData = this.token.decrypt(token);
        authAccessToken = tokenData.authTokens.accessToken;
        authRefreshToken = tokenData.authTokens.refreshToken;
      } catch (err) {
        return isJustTry ? next() : this.responseError(res, err, 401);
      }
      if (tokenData.clientId) {
        log.save('auth-user-with-client-id', { clientId: tokenData.clientId, userId: tokenData.userId, ...res.responseMeta });
      }

      // Append auth access token to request object.
      req.authAccessToken = authAccessToken;

      let cachedUserData;
      try {
        if (global.redisClient && !debugUserId && !roles.includes('admin')) {
          const sha1AccessToken = this.getSha1Hash(authAccessToken);
          cachedUserData = await global.redisClient.get(`token.${sha1AccessToken}`);
        }
      } catch (error) {
        return this.responseError(res, error, 500);
      }

      if (cachedUserData) {
        const userData = JSON.parse(cachedUserData);
        req.authUserInfo = userData.authUserInfo;
        req.authUserId = userData.authUserId;
        req.authUserRoles = userData.authUserRoles;
        req.authUserUnitEntities = userData.authUserUnitEntities;

        // Append userId and name to response object.
        const userId = userData.authUserInfo && userData.authUserInfo.userId;
        const userName = userData.authUserInfo && `${userData.authUserInfo.last_name || ''} ${userData.authUserInfo.first_name || ''} ${userData.authUserInfo.middle_name || ''}`;
        res.responseMeta = res.responseMeta
          ? { ...res.responseMeta, user: { id: userId, name: userName } }
          : { user: { id: userId, name: userName } };

        // Append trace meta.
        this.appendTraceMeta({ userId });
      } else {
        // Get user info.
        let authUserInfo;
        try {
          authUserInfo = await this.auth.getUser(authAccessToken);
        } catch (err) {
          return isJustTry ? next() : this.responseError(res, err, 401);
        }

        // Check user info.
        if (!authUserInfo || !authUserInfo.userId) {
          // Try to get new auth access token by refresh token.
          let newAuthTokens;
          try {
            newAuthTokens = await this.auth.renewTokens(authRefreshToken);
          } catch (err) {
            return isJustTry ? next() : this.responseError(res, err, 401);
          }

          // Append auth access token to request object.
          req.authAccessToken = newAuthTokens.accessToken;

          // Get user info.
          try {
            authUserInfo = await this.auth.getUser(newAuthTokens.accessToken);
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

        req.authUserInfo = this.auth.getMainUserInfo(authUserInfo, true, true);
        req.authUserId = authUserInfo && authUserInfo.userId;

        // Append userId and name to response object.
        const userId = authUserInfo && authUserInfo.userId;
        const userName = authUserInfo && `${authUserInfo.last_name || ''} ${authUserInfo.first_name || ''} ${authUserInfo.middle_name || ''}`;
        res.responseMeta = res.responseMeta
          ? { ...res.responseMeta, user: { id: userId, name: userName } }
          : { user: { id: userId, name: userName } };

        // Append trace meta.
        this.appendTraceMeta({ userId });

        // Check role.
        const userRoles = this.getUserRoles(req);

        const hasOneOfNeededRoles = this.hasOneOfNeededRoles(userRoles, roles);
        if (roles && !hasOneOfNeededRoles) {
          log.save('user-without-needed-roles', { authUserInfo, userRoles, neededRoles: roles }, 'error');
          return this.responseError(res, ERROR_MESSAGE_WITHOUT_NEEDED_ROLE, 401);
        }
        req.authUserRoles = userRoles;

        // Check units.
        const authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
        req.authUserUnitEntities = authUserUnitEntities;

        const authUserUnitIds = this.getRequestUserUnitIds(req);
        const allowableUnits = this.access.allowableUnits || [];
        const routeGroupsExceptions = this.access.routeGroupsExceptions || [ROUTE_GROUPS.PUBLIC];

        if (
          // Skip check for preconfigured allowed route groups.
          !routeGroupsExceptions.some((v) => groups.includes(v))
          // check only if allowableUnits are set in the configuration.
          && Array.isArray(allowableUnits)
          // ...and aren't empty.
          && allowableUnits.length
          // doesn't the user belong to any of the allowable units?
          && !allowableUnits.some((v) => authUserUnitIds.all.includes(v))
        ) {
          log.save('user-with-restricted-units', { authUserUnitIds });
          return this.responseError(res, ERROR_MESSAGE_RESTRICTED_UNIT, 403);
        }

        // Handle debug user.
        if (debugUserId) {
          // Append trace meta.
          this.appendTraceMeta({ debugUserId });

          // Check  access to debug user.
          const { adminUnitId } = global.config.admin;
          const adminUnitIds = [].concat(adminUnitId).filter(Boolean);

          if (!authUserUnitIds.all.some(v => adminUnitIds.includes(v))) {
            return this.responseError(res, ERROR_MESSAGE_DEBUG_USER_NOT_ALLOWED, 401);
          }

          // Get debug user data. getUsersByIds
          let authDebugUserInfo;
          try {
            authDebugUserInfo = (await this.auth.getUsersByIds([debugUserId], true))[0];
          } catch (error) {
            log.save('get-debug-user-error', { error: error && error.message }, 'error');
          }
          if (!authDebugUserInfo) {
            return this.responseError(res, ERROR_MESSAGE_DEBUG_USER_NOT_FOUND, 401);
          }

          // Set other user data as current user data.
          req.authUserInfo = this.auth.getMainUserInfo(authDebugUserInfo, true, true);
          req.authUserId = authDebugUserInfo && authDebugUserInfo.userId;
          const userRoles = this.getUserRoles(req);
          const hasOneOfNeededRoles = this.hasOneOfNeededRoles(userRoles, roles);
          if (roles && !hasOneOfNeededRoles) {
            log.save('user-without-needed-roles', { authUserInfo, userRoles, neededRoles: roles }, 'error');
            return this.responseError(res, ERROR_MESSAGE_WITHOUT_NEEDED_ROLE, 401);
          }
          req.authUserRoles = userRoles;
          const authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
          req.authUserUnitEntities = authUserUnitEntities;
        }

        if (global.redisClient && !authUserInfo.needOnboarding && !debugUserId) {
          const sha1AccessToken = this.getSha1Hash(authAccessToken);
          await global.redisClient.set(
            `token.${sha1AccessToken}`,
            {
              authUserInfo: req.authUserInfo,
              authUserId: req.authUserId,
              authUserRoles: req.authUserRoles,
              authUserUnitEntities: req.authUserUnitEntities
            },
            this.caching.getCheckMiddleware.ttl
          );
        }
      }


      // Check user access.
      const userAccessResult = await this.userAccess.checkAccess(req);
      if (!userAccessResult.isAllowed) {
        return this.responseError(res, 'Declined by user access rules.', 403, userAccessResult);
      }

      // Execute onboarding.
      try {
        await this.onboardingController.execute(req, res);
      } catch (err) {
        return this.responseError(res, err, err.httpStatusCode || 500);
      }

      // Go next.
      next();
    };
  }

  /**
   * Get user units.
   * @param {string} userId User ID.
   * @returns {Promise<{head: UnitEntity[], member: UnitEntity[], all: UnitEntity[]}>} Unit info.
   */
  async getUserUnitEntities(userId) {
    const units = await this.unitModel.getAll();
    const defaultUnits = this.config.auth.defaultUnits || [];
    const head = units.filter(v => v.heads.includes(userId));
    const member = units.filter(v => v.members.includes(userId) || defaultUnits.includes(v.id));
    const all = [...new Set([...head, ...member])];

    return { head, member, all };
  }

  /**
   * Get user roles.
   * @param {object} req HTTP request.
   */
  getUserRoles(req) {
    const authUserInfo = req.authUserInfo;
    const roles = (authUserInfo.role || '').split(ROLES_SEPARATOR).filter(role => role !== '');
    return roles;
  }

  /**
   * Has one of roles.
   * @param {string[]} existingRoles Existing roles.
   * @param {string[]} neededRoles Needed roles.
   */
  hasOneOfNeededRoles(existingRoles = [], neededRoles = []) {
    const hasOneOfNeededRoles = existingRoles.some(existing => neededRoles.includes(existing));
    return hasOneOfNeededRoles;
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
    const fullAvaUrl = avaUrl && `${this.config.auth.server}${avaUrl}`;
    const userInfo = { ...authUserInfo, authUserRoles, authUserUnits, fullAvaUrl };
    const normalizedUserInfo = this.auth.getMainUserInfo(userInfo, true, true);

    // If LDAP authorization is enabled and required, but the user is not
    // authorized by LDAP and has already passed the onboarding process,
    // return an error.
    if (
      LdapClient.isEnabled &&
      LdapClient.isRequired &&
      !normalizedUserInfo.services?.ldap &&
      normalizedUserInfo.needOnboarding === false
    ) {
      return this.responseError(res, ERROR_MESSAGE_LDAP_UNAUTHORIZED, 403);
    }

    // Response.
    const normalizedObject = this.convertUnderscoreKeysToCamelCase(normalizedUserInfo);
    this.responseData(res, this.transformToBase64WithHash(normalizedObject, 'md5'));
  }

  /**
   * Check auth could be mock.
   * @private
   * @param {string} token Token from auth header.
   * @returns {boolean}
   */
  isAuthCouldBeMock(token) {
    return this.config.auth.allowedTestAuth && this.config.test_users?.list?.some(user => user.token === token);
  }

  /**
   * Fake auth.
   * @private
   * @param {object} req Express request object.
   * @param {string} token Token from auth header.
   */
  async fakeAuth(req, token) {
    const foundUser = this.config.test_users?.list?.find(user => user.token === token);
    const { user: authUserInfo } = foundUser || {};

    // Append auth user info to request object.
    req.authUserInfo = authUserInfo;
    req.authUserId = authUserInfo && authUserInfo.userId;

    // Check role.
    const userRoles = this.getUserRoles(req);
    req.authUserRoles = userRoles;

    // Check units.
    const authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
    req.authUserUnitEntities = authUserUnitEntities;
  }

  /**
   * Handle Basic auth token.
   * @param {string} token Token value from auth header.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  handleBasicAuthToken(token, req, res, next) {
    // Check token in config.
    const availableTokens = this.config.basic_auth.tokens;
    const isCorrectToken = availableTokens.includes(token) || availableTokens.includes(`Basic ${token}`);
    if (!isCorrectToken) { return this.responseError(res, 'Unknown basic auth token.', 401); }

    // Parse token.
    const parsedTokenParts = (Buffer.from(token, 'base64').toString('utf8')).split(':');
    if (parsedTokenParts.length !== 2) { return this.responseError(res, 'Incorrect basic auth token.', 401); }
    log.save('auth|basic-auth|client-login', parsedTokenParts[0]);

    // Get user.
    const [user] = parsedTokenParts;
    req.basicAuthUser = user;

    // Append trace meta.
    this.appendTraceMeta({ basicAuthUser: user });

    // Go next in other cases.
    next();
  }

  /**
   * Handle Bearer auth token.
   * @param {string} token Token value from auth header.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  handleBearerAuthToken(token, req, res, next) {
    // Parse token.
    let tokenData;
    try {
      tokenData = this.token.decrypt(token);
    } catch (error) {
      return this.responseError(res, error, 401);
    }

    // Get user.
    const { user } = tokenData;
    req.basicAuthUser = user;
    req.isBearerAuth = true;

    // Append trace meta.
    this.appendTraceMeta({ basicAuthUser: user });
    this.appendTraceMeta({ isBearerAuth: true });

    // Go next in other cases.
    next();
  }

  /**
   * Basic or Bearer auth.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  basicOrBearerAuth(req, res, next) {
    // Define params.
    const { authorization: token } = req.headers;
    if (!token) { return this.responseError(res, 'Unknown basic auth token.', 401); }

    // Define token parts.
    const tokenParts = token.split(' ');
    const [tokenKeyword, tokenValue] = tokenParts;

    // Check token parts.
    switch (tokenKeyword) {
      case 'Basic':
        return this.handleBasicAuthToken(tokenValue, req, res, next);
      case 'Bearer':
        return this.handleBearerAuthToken(tokenValue, req, res, next);
      default:
        return this.responseError(res, 'Wrong auth token type.', 401);
    }
  }

  /**
   * @param {string} httpHeaderName
   * @return {(function(req: Express.Request, res: Express.Response, next: function): Promise<*>)}
   */
  externalIdHeaderAuth(httpHeaderName) {
    return async (req, res, next) => {
      const externalId = req.headers[httpHeaderName];
      if (!externalId) {
        return this.responseError(res, 'External ID not defined.', 401);
      }

      const isExternalIdExists = await global.models.document.isExternalIdExists(externalId);
      if (!isExternalIdExists) {
        return this.responseError(res, 'Unknown External ID.', 401);
      }

      return next();
    };
  }

  /**
   * Get Bearer oken.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getBearerToken(req, res) {
    // Check Basic auth user.
    if (!req.basicAuthUser) { return this.responseError(res, 'Basic auth user is not defined.', 401); }

    // Generate Bearer token.
    const bearerToken = this.token.generateBearer(req.basicAuthUser);

    // Response.
    this.responseData(res, { token_type: 'bearer', access_token: bearerToken });
  }

  async checkProtectedBasicAuth(req, res, next) {
    const { originalUrl } = req;
    const protectedRoute = this.config.basic_auth.protectedRoutes?.find(item => item.route === originalUrl);
    if (!protectedRoute) {
      return this.responseError(res, 'Protected route. Must define access rule in config.', 403);
    }
    const { basicAuthUsers = [] } = protectedRoute;
    const isAllowed = basicAuthUsers.includes(req.basicAuthUser);
    if (!isAllowed) {
      return this.responseError(res, 'Protected route. Not allowed for this user.', 403);
    }
    next();
  }

  /**
   * Generate and return sha1 hash.
   * @param {string} data.
   * @return {string}
   */
  getSha1Hash(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
  }

  /**
   * Associate the user with LDAP-enabled units
   * @param {*} userInfo
   */
  async #processLDAPUnits(userInfo) {
    log.save('login-process-ldap-units');

    // Extract LDAP data from user info.
    const ldapInfo = userInfo?.services?.ldap;
    if (!ldapInfo) {
      log.save(
        'login-process-ldap-units|not-authenticated',
        { services: Object.keys(userInfo.services) },
        'warn',
      );
      return;
    }

    // Extract the DN of the user.
    const userDn = ldapInfo.data?.dn;
    if (!userDn) {
      log.save('login-process-ldap-units|no-dn', { ldapInfo }, 'error');
      return;
    }

    // Extract the DN of user OU
    const userOuDn = userDn.split(',').slice(1).join(',');

    const ldapClient = LdapClient.getInstance();

    let ouObject;
    try {
      ouObject = await ldapClient.findObjectByDn('organizationalUnit', userOuDn);
    } catch (error) {
      log.save(
        'login-process-ldap-units|find-ou-object-by-dn-error',
        { userOuDn, error: error.toString() },
        'error',
      );
      return;
    }

    if (!ouObject) {
      log.save('login-process-ldap-units|ou-object-not-found', { userOuDn }, 'error');
      return;
    }

    const allUnits = await this.unitModel.getAll();
    const associatedUnit = allUnits.find(unit => unit.data?.ldap?.dn === ouObject.dn);

    if (!associatedUnit) {
      log.save('login-process-ldap-units|associated-unit-not-found', { ouObject }, 'warn');
      return;
    }

    if (!associatedUnit.members.includes(userInfo.userId)) {
      log.save('login-process-ldap-units|add-member', { userId: userInfo.userId, unitId: associatedUnit.id });
      await this.unitModel.addMember(associatedUnit.id, userInfo.userId);
    } else {
      log.save(
        'login-process-ldap-units|member-already-associated',
        { userId: userInfo.userId, unitId: associatedUnit.id },
      );
    }

    // TODO: Remove the user from the previous unit if it is different from the current one?
  }
}

module.exports = AuthController;
