import crypto from 'node:crypto';

import type { Request } from 'express';
import { getIdApiClient, IdApiClient } from '@liquio/back-core';

import { Controller } from './controller';
import { Token } from '../lib/token';
import { UserAccess } from '../lib/user_access';
import { UnitModel } from '../models/unit';
import { LdapUnitSync } from '../services/ldap_unit_sync';
import { TaskModel } from '../models/task';
import { WorkflowModel } from '../models/workflow';
import { GROUPS as ROUTE_GROUPS } from '../services/router/routes';
import { OnboardingController } from './onboarding';
import { getBusinesses, getConfig, getLog, getModels, getRedisClient } from '../lib/context';

// Constants.
const ROLES_SEPARATOR = ';';
const ERROR_MESSAGE_TOKEN_NOT_DEFINED = 'Token should be defined in request headers.';
const ERROR_MESSAGE_WITHOUT_NEEDED_ROLE = 'User without needed role.';
const ERROR_MESSAGE_DEBUG_USER_NOT_ALLOWED = 'User without needed unit to debug other user.';
const ERROR_MESSAGE_DEBUG_USER_NOT_FOUND = 'Debug user not found.';
const ERROR_MESSAGE_RESTRICTED_UNIT = 'forbidden';

// This middleware attaches authUserInfo (and friends) to req before it reaches a controller (see
// AuthController#middleware below); it isn't part of Express's own Request type, so any
// controller reading it types its request with AuthenticatedRequest instead of plain Request.
export interface AuthUserInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  ipn?: string;
  edrpou?: string;
}

export type AuthenticatedRequest<Params, ReqBody = any, ReqQuery = any> = Request<Params, any, ReqBody, ReqQuery> & {
  authUserInfo?: AuthUserInfo;
};

// Subset of config.access used by this controller.
interface AccessConfig {
  allowableUnits?: number[];
  routeGroupsExceptions?: string[];
}

// Subset of config.auth.caching used by this controller.
interface CachingConfig {
  getCheckMiddleware: { ttl: number };
}

/**
 * Auth controller.
 */
export class AuthController extends Controller {
  private static singleton: AuthController;

  idApiClient: IdApiClient;
  token: Token;
  access: AccessConfig;
  userAccess: UserAccess;
  unitModel: UnitModel;
  taskModel: TaskModel;
  workflowModel: WorkflowModel;
  onboardingController: OnboardingController;
  ldapUnitSync: LdapUnitSync;
  caching: CachingConfig;

  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);

      // Auth controller config.
      this.idApiClient = getIdApiClient();
      this.token = new Token(config.auth);
      this.access = config.access;
      this.userAccess = new UserAccess();
      this.unitModel = new UnitModel();
      this.taskModel = new TaskModel();
      this.workflowModel = new WorkflowModel();
      this.onboardingController = new OnboardingController(config);
      this.ldapUnitSync = new LdapUnitSync({ unitModel: this.unitModel, idApiClient: this.idApiClient });

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

    getLog().save('auth-login-start');

    // Define params.
    const { code } = req.body;

    // Get auth tokens.
    let authTokens;
    try {
      authTokens = await this.idApiClient.getTokens(code, { codeVerifier: req.body.code_verifier });
    } catch (err) {
      getLog().save(
        'auth-login-error|cannot-get-tokens',
        {
          error: err.message,
          codeShort: typeof code === 'string' ? `${code.slice(0, 8)}****${code.slice(-8)}` : String(code),
          codeHash: crypto.createHash('sha256').update(code).digest('hex'),
        },
        'error',
      );
      return this.responseError(res, err, 401);
    }
    getLog().save('auth-login-tokens', authTokens);
    const { accessToken, refreshToken } = authTokens;

    // Get user info.
    let authUserInfo;
    try {
      authUserInfo = await this.idApiClient.getUser(authTokens.accessToken);
      const userName = `${authUserInfo.last_name || ''} ${authUserInfo.first_name || ''} ${authUserInfo.middle_name || ''}`.trim();

      // Handle units.
      const units = await this.unitModel.getAll();
      let unitsUpdated = false;
      for (const unit of units) {
        const headIpn = (unit.headsIpn || []).find((v) => v === authUserInfo.ipn);
        if (headIpn) {
          unitsUpdated = true;
          await this.unitModel.addHead(unit.id, authUserInfo.userId);
          await this.unitModel.removeHeadIpn(unit.id, headIpn);

          // Save to access history.
          await getModels().accessHistory.update(unit.id, headIpn, 'added-to-head-unit', {
            userId: authUserInfo.userId,
            userName: userName,
          });

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await this.unitModel.addHead(baseUnitId, authUserInfo.userId);

            // Save to access history.
            await getModels().accessHistory.update(baseUnitId, headIpn, 'added-to-head-unit', {
              userId: authUserInfo.userId,
              userName: userName,
            });
          }
        }
        const memberIpn = (unit.membersIpn || []).find((v) => v === authUserInfo.ipn);
        if (memberIpn) {
          unitsUpdated = true;
          await this.unitModel.addMember(unit.id, authUserInfo.userId);
          await this.unitModel.removeMemberIpn(unit.id, memberIpn);

          // Save to access history.
          await getModels().accessHistory.update(unit.id, memberIpn, 'added-to-member-unit', {
            userId: authUserInfo.userId,
            userName: userName,
          });

          // Handle base units.
          const { basedOn = [] } = unit || {};
          for (const baseUnitId of basedOn) {
            await this.unitModel.addMember(baseUnitId, authUserInfo.userId);

            // Save to access history.
            await getModels().accessHistory.update(baseUnitId, memberIpn, 'added-to-member-unit', {
              userId: authUserInfo.userId,
              userName: userName,
            });
          }
        }
        const requestedMember = (unit.requestedMembers || []).find((v) => v.ipn === authUserInfo.ipn);
        if (requestedMember) {
          unitsUpdated = true;
          const { firstName: requestedMemberFirstName, middleName: requestedMemberMiddleName, lastName: requestedMemberLastName } = requestedMember;
          const { first_name: userFirstName, middle_name: userMiddleName, last_name: userLastName } = authUserInfo;
          const theSameName =
            `${requestedMemberFirstName}`.toLowerCase() === `${userFirstName}`.toLowerCase() &&
            (`${requestedMemberMiddleName}`.toLowerCase() === `${userMiddleName}`.toLowerCase() || !requestedMemberMiddleName) &&
            `${requestedMemberLastName}`.toLowerCase() === `${userLastName}`.toLowerCase();
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
              wrongUserInfo: true,
            });
          }
        }
      }

      // Update units cache.
      if (unitsUpdated) {
        await this.unitModel.getAll();
      }

      // Sync LDAP-managed units. Never fails the login.
      await this.ldapUnitSync.sync(authUserInfo);

      // Handle tasks where the user is a performer.
      await this.taskModel.addPerformerUserByIpnOrEmail(authUserInfo.ipn, authUserInfo.email, authUserInfo.userId, userName);

      // Handle workflows.
      await this.workflowModel.updateCreatedBy(authUserInfo.ipn, authUserInfo.userId);
    } catch (error) {
      getLog().save('auth-login-error|cannot-process-auth-user-info', { error: error?.message, details: error?.details }, 'error');
      return this.responseError(res, error, 401);
    }
    getLog().save('auth-login-user-info', authUserInfo);

    // Get token.
    let token;
    try {
      token = this.token.generate({ authTokens, authUserInfo });
    } catch (err) {
      getLog().save('auth-login-error|cannot-generate-token', { error: err?.message, details: err?.details }, 'error');
      return this.responseError(res, err, 401);
    }

    const userId = authUserInfo && authUserInfo.userId;
    // Logout other sessions.
    const needLogoutOtherSessions = !this.config.auth.doNotLogoutOtherSessions;
    if (needLogoutOtherSessions) {
      try {
        this.idApiClient.logoutOtherSessions(userId, accessToken, refreshToken);
      } catch (error) {
        getLog().save('logout-other-sessions-error', { error, needLogoutOtherSessions }, 'warn');
      }
    }

    try {
      if (getRedisClient()) {
        const tokenData = this.token.decrypt(token);
        const authAccessToken = tokenData.authTokens.accessToken;
        const sha256AccessToken = this.getSha256Hash(authAccessToken);
        await getRedisClient().delete(`token.${sha256AccessToken}`);
      }
    } catch (error) {
      getLog().save('auth-login-error|cannot-delete-cached-user-data', { error: error.toString() }, 'error');
      return this.responseError(res, 'Cannot delete cached user data.', 500);
    }
    try {
      await getBusinesses().task.deleteExpiredDraftsByUserId(userId);
    } catch (error) {
      getLog().save('delete-expired-drafts-by-user-id|delete-while-login-error', { userId, error: error?.message || error });
    }

    // Response.
    getLog().save('auth-login-success', { userId });
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
    const testAuth = this.config.test_users?.list?.find((v) => v.code === code);
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
        getLog().save('auth-user-with-client-id', { clientId: tokenData.clientId, userId: tokenData.userId, ...res.responseMeta });
      }

      // Append auth access token to request object.
      req.authAccessToken = authAccessToken;

      let cachedUserData;
      try {
        if (getRedisClient() && !debugUserId && !roles.includes('admin')) {
          const sha256AccessToken = this.getSha256Hash(authAccessToken);
          cachedUserData = await getRedisClient().get(`token.${sha256AccessToken}`);
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
        const userName =
          userData.authUserInfo &&
          `${userData.authUserInfo.last_name || ''} ${userData.authUserInfo.first_name || ''} ${userData.authUserInfo.middle_name || ''}`;
        res.responseMeta = res.responseMeta
          ? { ...res.responseMeta, user: { id: userId, name: userName } }
          : { user: { id: userId, name: userName } };

        // Append trace meta.
        this.appendTraceMeta({ userId });

        // Cached user data is stored per token and is not bound to the route, so check route requirements every time.
        const cachedRolesError = this.checkRequestUserRoles(req, roles);
        if (cachedRolesError) {
          return this.responseError(res, cachedRolesError.message, cachedRolesError.status);
        }
        const cachedUnitsError = this.checkRequestUserUnits(req, groups);
        if (cachedUnitsError) {
          return this.responseError(res, cachedUnitsError.message, cachedUnitsError.status);
        }
      } else {
        // Get user info.
        let authUserInfo;
        try {
          authUserInfo = await this.idApiClient.getUser(authAccessToken);
        } catch (err) {
          return isJustTry ? next() : this.responseError(res, err, 401);
        }

        // Check user info.
        if (!authUserInfo || !authUserInfo.userId) {
          // Try to get new auth access token by refresh token.
          let newAuthTokens;
          try {
            newAuthTokens = await this.idApiClient.renewTokens(authRefreshToken);
          } catch (err) {
            return isJustTry ? next() : this.responseError(res, err, 401);
          }

          // Append auth access token to request object.
          req.authAccessToken = newAuthTokens.accessToken;

          // Get user info.
          try {
            authUserInfo = await this.idApiClient.getUser(newAuthTokens.accessToken);
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

        req.authUserInfo = this.idApiClient.getMainUserInfo(authUserInfo, true, true);
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
        req.authUserRoles = this.getUserRoles(req);

        const rolesError = this.checkRequestUserRoles(req, roles);
        if (rolesError) {
          return this.responseError(res, rolesError.message, rolesError.status);
        }

        // Sync LDAP-managed units if the user's groups were refreshed. Never fails the request.
        await this.ldapUnitSync.syncIfChanged(authUserInfo);

        // Check units.
        const authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
        req.authUserUnitEntities = authUserUnitEntities;

        const unitsError = this.checkRequestUserUnits(req, groups);
        if (unitsError) {
          return this.responseError(res, unitsError.message, unitsError.status);
        }

        // Handle debug user.
        if (debugUserId) {
          // Append trace meta.
          this.appendTraceMeta({ debugUserId });

          // Check  access to debug user.
          const { adminUnitId } = getConfig().admin;
          const adminUnitIds = [].concat(adminUnitId).filter(Boolean);

          const authUserUnitIds = this.getRequestUserUnitIds(req);
          if (!authUserUnitIds.all.some((v) => adminUnitIds.includes(v))) {
            return this.responseError(res, ERROR_MESSAGE_DEBUG_USER_NOT_ALLOWED, 401);
          }

          // Get debug user data. getUsersByIds
          let authDebugUserInfo;
          try {
            authDebugUserInfo = (await this.idApiClient.getUsersByIds([debugUserId], { withPrivateProps: true }))[0];
          } catch (error) {
            getLog().save('get-debug-user-error', { error: error && error.message }, 'error');
          }
          if (!authDebugUserInfo) {
            return this.responseError(res, ERROR_MESSAGE_DEBUG_USER_NOT_FOUND, 401);
          }

          // Set other user data as current user data.
          req.authUserInfo = this.idApiClient.getMainUserInfo(authDebugUserInfo, true, true);
          req.authUserId = authDebugUserInfo && authDebugUserInfo.userId;
          const userRoles = this.getUserRoles(req);
          const hasOneOfNeededRoles = this.hasOneOfNeededRoles(userRoles, roles);
          if (roles && !hasOneOfNeededRoles) {
            getLog().save('user-without-needed-roles', { authUserInfo, userRoles, neededRoles: roles }, 'error');
            return this.responseError(res, ERROR_MESSAGE_WITHOUT_NEEDED_ROLE, 401);
          }
          req.authUserRoles = userRoles;
          const authUserUnitEntities = await this.getUserUnitEntities(req.authUserId);
          req.authUserUnitEntities = authUserUnitEntities;
        }

        if (getRedisClient() && !authUserInfo.needOnboarding && !debugUserId) {
          const sha256AccessToken = this.getSha256Hash(authAccessToken);
          await getRedisClient().set(
            `token.${sha256AccessToken}`,
            {
              authUserInfo: req.authUserInfo,
              authUserId: req.authUserId,
              authUserRoles: req.authUserRoles,
              authUserUnitEntities: req.authUserUnitEntities,
            },
            this.caching.getCheckMiddleware.ttl,
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
    const head = units.filter((v) => v.heads.includes(userId));
    const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id));
    const all = [...new Set([...head, ...member])];

    return { head, member, all };
  }

  /**
   * Check request user roles against the roles needed by the route.
   * @param {object} req HTTP request with `authUserInfo` and `authUserRoles`.
   * @param {string[]} [roles] Roles that has access (check by "or").
   * @returns {{ message: string, status: number }|null} Error to respond with or null if the check is passed.
   */
  checkRequestUserRoles(req, roles?: string[]): { message: string; status: number } | null {
    if (roles && !this.hasOneOfNeededRoles(req.authUserRoles, roles)) {
      getLog().save('user-without-needed-roles', { authUserInfo: req.authUserInfo, userRoles: req.authUserRoles, neededRoles: roles }, 'error');
      return { message: ERROR_MESSAGE_WITHOUT_NEEDED_ROLE, status: 401 };
    }
    return null;
  }

  /**
   * Check request user units against the allowable units from the configuration.
   * @param {object} req HTTP request with `authUserUnitEntities`.
   * @param {string[]} [groups] Route groups.
   * @returns {{ message: string, status: number }|null} Error to respond with or null if the check is passed.
   */
  checkRequestUserUnits(req, groups: string[] = []): { message: string; status: number } | null {
    const authUserUnitIds = this.getRequestUserUnitIds(req);
    const allowableUnits = this.access.allowableUnits || [];
    const routeGroupsExceptions = this.access.routeGroupsExceptions || [ROUTE_GROUPS.PUBLIC];

    if (
      // Skip check for preconfigured allowed route groups.
      !routeGroupsExceptions.some((v) => groups.includes(v)) &&
      // check only if allowableUnits are set in the configuration.
      Array.isArray(allowableUnits) &&
      // ...and aren't empty.
      allowableUnits.length &&
      // doesn't the user belong to any of the allowable units?
      !allowableUnits.some((v) => authUserUnitIds.all.includes(v))
    ) {
      getLog().save('user-with-restricted-units', { authUserUnitIds });
      return { message: ERROR_MESSAGE_RESTRICTED_UNIT, status: 403 };
    }
    return null;
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
    const { authUserInfo, authUserRoles } = req;
    const authUserUnits = this.getRequestUserUnits(req);

    // The ava URL is already full (the id-api client built it).
    const fullAvaUrl = authUserInfo && authUserInfo.avaUrl;
    const userInfo = { ...authUserInfo, authUserRoles, authUserUnits, fullAvaUrl };
    const normalizedUserInfo = this.idApiClient.getMainUserInfo(userInfo, true, true);

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
    return this.config.auth.allowedTestAuth && this.config.test_users?.list?.some((user) => user.token === token);
  }

  /**
   * Fake auth.
   * @private
   * @param {object} req Express request object.
   * @param {string} token Token from auth header.
   */
  async fakeAuth(req, token) {
    const foundUser = this.config.test_users?.list?.find((user) => user.token === token);
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
    if (!isCorrectToken) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }

    // Parse token.
    const parsedTokenParts = Buffer.from(token, 'base64').toString('utf8').split(':');
    if (parsedTokenParts.length !== 2) {
      return this.responseError(res, 'Incorrect basic auth token.', 401);
    }
    getLog().save('auth|basic-auth|client-login', parsedTokenParts[0]);

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
  async handleBearerAuthToken(token, req, res, next) {
    // Parse token.
    let tokenData;
    try {
      tokenData = this.token.decrypt(token);
    } catch (error) {
      return this.responseError(res, error, 401);
    }

    // Check revocation. Tokens issued before `jti` was introduced have no id and stay valid until they expire.
    if (tokenData.jti && getRedisClient()) {
      let isRevoked;
      try {
        isRevoked = await getRedisClient().get(`bearer.revoked.${tokenData.jti}`);
      } catch (error) {
        getLog()?.save('auth|bearer-revocation-check-failed', { error: error?.message });
      }
      if (isRevoked) {
        return this.responseError(res, 'Bearer token is revoked.', 401);
      }
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
    if (!token) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }

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
   * Basic auth only. Rejects Bearer so it cannot be used to mint new tokens.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  basicOnlyAuth(req, res, next) {
    const { authorization: token } = req.headers;
    if (!token) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }
    const [tokenKeyword, tokenValue] = token.split(' ');
    if (tokenKeyword !== 'Basic') {
      return this.responseError(res, 'Basic auth required.', 401);
    }
    return this.handleBasicAuthToken(tokenValue, req, res, next);
  }

  /**
   * Revoke Bearer token by its jti without rotating jwtSecret.
   * @param {string} jti Token id.
   * @param {number} [ttlSeconds] Denylist ttl, should cover the token lifetime (default 7 days).
   */
  async revokeBearerToken(jti, ttlSeconds = 7 * 24 * 60 * 60) {
    if (!getRedisClient()) {
      throw new Error('Redis is required to revoke Bearer tokens.');
    }
    await getRedisClient().set(`bearer.revoked.${jti}`, true, ttlSeconds);
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

      const isExternalIdExists = await getModels().document.isExternalIdExists(externalId);
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
    if (!req.basicAuthUser) {
      return this.responseError(res, 'Basic auth user is not defined.', 401);
    }

    // Generate Bearer token.
    const bearerToken = this.token.generateBearer(req.basicAuthUser);

    // Response.
    this.responseData(res, { token_type: 'bearer', access_token: bearerToken });
  }

  /**
   * Check per-integration access rule for a basicAuth route.
   * Rules are matched by route pattern (`req.route.path`, e.g. `/units/:id`) and HTTP method, not by the request URL,
   * so query string and path params do not affect matching. A rule may limit methods with `method` (string) or `methods`
   * (array); without them it applies to every method. A route without a matching rule is denied.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  async checkProtectedBasicAuth(req, res, next) {
    const routePattern = req.route?.path;
    const method = String(req.method || '').toUpperCase();
    const protectedRoutes = this.config.basic_auth.protectedRoutes || [];
    const matchedRules = protectedRoutes.filter((item) => {
      if (item.route !== routePattern) {
        return false;
      }
      const methods = [].concat(item.methods || item.method || []).map((m) => String(m).toUpperCase());
      return methods.length === 0 || methods.includes(method);
    });
    if (matchedRules.length === 0) {
      return this.responseError(res, 'Protected route. Must define access rule in config.', 403);
    }
    const isAllowed = matchedRules.some(({ basicAuthUsers = [] }) => basicAuthUsers.includes(req.basicAuthUser));
    if (!isAllowed) {
      return this.responseError(res, 'Protected route. Not allowed for this user.', 403);
    }
    next();
  }

  /**
   * Per-integration scoping for every basicAuth route. Opt-in via `basic_auth.scopedRoutes: true`; when it is off this is a no-op.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next request handler.
   */
  async checkScopedBasicAuth(req, res, next) {
    if (this.config.basic_auth?.scopedRoutes !== true) {
      return next();
    }
    return this.checkProtectedBasicAuth(req, res, next);
  }

  /**
   * Generate and return sha256 hash.
   * @param {string} data.
   * @return {string}
   */
  getSha256Hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
