import { AuthController } from './auth';
import { Token } from '../lib/token';
import { routes } from '../services/router/routes';
import shippedBasicAuth from '../../../../config-templates/task/basic_auth.json';

jest.mock('../models/unit', () => ({ UnitModel: jest.fn() }));

describe('AuthController', () => {
  let client: Record<string, jest.Mock>;
  let controller: AuthController;
  let responseData: jest.SpyInstance;

  beforeEach(() => {
    // Bypass the singleton constructor: it needs the models and the id-api client.
    controller = Object.create(AuthController.prototype);
    client = { getMainUserInfo: jest.fn() };
    controller.idApiClient = client as any;
    (controller as any).config = { auth: { server: 'http://id.local' } };
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    jest.spyOn(controller, 'getRequestUserUnits').mockReturnValue([] as any);
    jest.spyOn(controller, 'transformToBase64WithHash').mockImplementation((data) => data);
  });

  describe('me', () => {
    it('should not prefix an already full avatar URL again', async () => {
      const avaUrl = 'http://id.local:8100/ava/u1.png';
      // The client keeps an already full avatar URL as is.
      client.getMainUserInfo.mockImplementation((user) => ({ ...user }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl }, authUserRoles: ['a'] };

      await controller.me(req, {});

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe(avaUrl);
      expect(data.avaUrl).toBe(avaUrl);
    });

    it('should respond with an empty avatar URL when the user has none', async () => {
      client.getMainUserInfo.mockImplementation((user) => ({ ...user, avaUrl: '' }));
      const req: any = { authUserInfo: { userId: 'u1', avaUrl: '' }, authUserRoles: [] };

      await controller.me(req, {});

      const data = responseData.mock.calls[0][1];
      expect(data.fullAvaUrl).toBe('');
      expect(data.avaUrl).toBe('');
    });
  });

  describe('handleBasicAuthToken', () => {
    // The token that used to be committed to config-templates, built here to keep the literal out of the sources.
    const oldDefaultToken = `Basic ${Buffer.from(['task', 'task'].join(':')).toString('base64')}`;
    const issuedToken = `Basic ${Buffer.from('admin-api:Zk3p9QwLm2Xv8Rt').toString('base64')}`;

    beforeEach(() => {
      (controller as any).config = { basic_auth: { tokens: [issuedToken] } };
      jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
      jest.spyOn(controller as any, 'appendTraceMeta').mockImplementation(() => undefined);
      (global as any).log = { save: jest.fn() };
    });

    it('should reject the old default token', () => {
      const next = jest.fn();

      controller.handleBasicAuthToken(oldDefaultToken.slice(6), {}, {}, next);

      expect(controller.responseError).toHaveBeenCalledWith({}, 'Unknown basic auth token.', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept the configured token', () => {
      const next = jest.fn();
      const req: any = {};

      controller.handleBasicAuthToken(issuedToken.slice(6), req, {}, next);

      expect(req.basicAuthUser).toBe('admin-api');
      expect(next).toHaveBeenCalled();
    });
  });
  describe('bearer tokens', () => {
    const basic = `Basic ${Buffer.from('admin-api:Zk3p9QwLm2Xv8Rt').toString('base64')}`;
    let token: Token;
    let redis: { get: jest.Mock };

    beforeEach(() => {
      token = Object.create(Token.prototype);
      Object.assign(token, { config: {}, jwtSecret: 's3cret', jwtOptions: { expiresIn: '1d' } });
      (controller as any).token = token;
      (controller as any).config = { basic_auth: { tokens: [basic] } };
      jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
      jest.spyOn(controller as any, 'appendTraceMeta').mockImplementation(() => undefined);
      (global as any).log = { save: jest.fn() };
      redis = { get: jest.fn() };
      (global as any).redisClient = redis;
    });

    afterEach(() => {
      (global as any).redisClient = undefined;
    });

    it('should reject a Bearer token on the basic-only route', () => {
      const next = jest.fn();
      const bearer = token.generateBearer('admin-api');

      controller.basicOnlyAuth({ headers: { authorization: `Bearer ${bearer}` } }, {}, next);

      expect(controller.responseError).toHaveBeenCalledWith({}, 'Basic auth required.', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept Basic on the basic-only route', () => {
      const next = jest.fn();
      const req: any = { headers: { authorization: basic } };

      controller.basicOnlyAuth(req, {}, next);

      expect(req.basicAuthUser).toBe('admin-api');
      expect(next).toHaveBeenCalled();
    });

    it('should issue Bearer with jti and a fixed expiry', () => {
      const payload: any = token.decrypt(token.generateBearer('admin-api'));

      expect(payload.jti).toEqual(expect.any(String));
      expect(payload.iat).toEqual(expect.any(Number));
      expect(payload.exp - payload.iat).toBe(86400);
    });

    it('should honour bearer.maxAgeSeconds', () => {
      token.config = { bearer: { maxAgeSeconds: 600 } };
      const payload: any = token.decrypt(token.generateBearer('admin-api'));

      expect(payload.exp - payload.iat).toBe(600);
    });

    it('should accept a valid Bearer token', async () => {
      const next = jest.fn();
      const req: any = {};
      redis.get.mockResolvedValue(undefined);

      await controller.handleBearerAuthToken(token.generateBearer('admin-api'), req, {}, next);

      expect(req.basicAuthUser).toBe('admin-api');
      expect(next).toHaveBeenCalled();
    });

    it('should reject a revoked Bearer token', async () => {
      const next = jest.fn();
      const bearer = token.generateBearer('admin-api');
      const { jti }: any = token.decrypt(bearer);
      redis.get.mockImplementation(async (key) => (key === `bearer.revoked.${jti}` ? true : undefined));

      await controller.handleBearerAuthToken(bearer, {}, {}, next);

      expect(controller.responseError).toHaveBeenCalledWith({}, 'Bearer token is revoked.', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should keep accepting already issued Bearer tokens without jti', async () => {
      const next = jest.fn();
      const legacy = require('jsonwebtoken').sign({ user: 'admin-api' }, 's3cret', { expiresIn: '1d' });

      await controller.handleBearerAuthToken(legacy, {}, {}, next);

      expect(redis.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkProtectedBasicAuth / checkScopedBasicAuth', () => {
    let responseError: jest.SpyInstance;
    const protectedRoutes = [
      { route: '/units/:id', method: 'GET', basicAuthUsers: ['admin-api'] },
      { route: '/unit-access', methods: ['GET', 'POST'], basicAuthUsers: ['admin-api'] },
      { route: '/tasks/by-other-system', basicAuthUsers: ['event'] },
    ];
    const makeReq = (path, method, user, originalUrl = path): any => ({ route: { path }, method, basicAuthUser: user, originalUrl });

    beforeEach(() => {
      (controller as any).config = { basic_auth: { tokens: [], protectedRoutes } };
      responseError = jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
    });

    it('should match by route pattern, ignoring path params and query string', async () => {
      const next = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/units/:id', 'GET', 'admin-api', '/units/42?with=members'), {}, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(responseError).not.toHaveBeenCalled();
    });

    it('should allow the user listed for the route and deny another user with 403', async () => {
      const next = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/tasks/by-other-system', 'POST', 'event'), {}, next);
      expect(next).toHaveBeenCalledTimes(1);

      const nextDenied = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/tasks/by-other-system', 'POST', 'admin-api'), {}, nextDenied);
      expect(nextDenied).not.toHaveBeenCalled();
      expect(responseError).toHaveBeenCalledWith({}, 'Protected route. Not allowed for this user.', 403);
    });

    it('should deny a route without a rule with 403', async () => {
      const next = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/external_services/workflow', 'POST', 'admin-api'), {}, next);
      expect(next).not.toHaveBeenCalled();
      expect(responseError).toHaveBeenCalledWith({}, 'Protected route. Must define access rule in config.', 403);
    });

    it('should honour the method limit of a rule', async () => {
      const next = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/unit-access', 'POST', 'admin-api'), {}, next);
      expect(next).toHaveBeenCalledTimes(1);

      const nextDenied = jest.fn();
      await controller.checkProtectedBasicAuth(makeReq('/unit-access', 'DELETE', 'admin-api'), {}, nextDenied);
      expect(nextDenied).not.toHaveBeenCalled();
      expect(responseError).toHaveBeenCalledWith({}, 'Protected route. Must define access rule in config.', 403);
    });

    it('should not scope routes when scopedRoutes is off (default)', async () => {
      const next = jest.fn();
      await controller.checkScopedBasicAuth(makeReq('/external_services/workflow', 'POST', 'anyone'), {}, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(responseError).not.toHaveBeenCalled();
    });

    it('should enforce the rules on every basicAuth route when scopedRoutes is on', async () => {
      (controller as any).config = { basic_auth: { tokens: [], scopedRoutes: true, protectedRoutes } };
      const next = jest.fn();
      await controller.checkScopedBasicAuth(makeReq('/external_services/workflow', 'POST', 'admin-api'), {}, next);
      expect(next).not.toHaveBeenCalled();
      expect(responseError).toHaveBeenCalledWith({}, 'Protected route. Must define access rule in config.', 403);

      const nextAllowed = jest.fn();
      await controller.checkScopedBasicAuth(makeReq('/units/:id', 'GET', 'admin-api', '/units/1'), {}, nextAllowed);
      expect(nextAllowed).toHaveBeenCalledTimes(1);
    });
  });

  describe('shipped config-templates/task/basic_auth.json with scopedRoutes on', () => {
    let responseError: jest.SpyInstance;
    const ruleFor = (route) => shippedBasicAuth.protectedRoutes.filter((rule) => rule.route === route);
    const callerRoutes = {
      'admin-api': [
        ['GET', '/workflows/elastic-filtered'],
        ['GET', '/unit-access'],
        ['POST', '/unit-access'],
        ['GET', '/unit-access/:id'],
        ['PUT', '/unit-access/:id'],
        ['DELETE', '/unit-access/:id'],
        ['DELETE', '/register/cache'],
      ],
      event: [
        ['POST', '/tasks/by-other-system'],
        ['PUT', '/external_services/workflow/:workflow_id/task_template/:task_template_id'],
      ],
    };
    const check = async (user, method, path) => {
      const next = jest.fn();
      await controller.checkScopedBasicAuth({ route: { path }, method, basicAuthUser: user } as any, {}, next);
      return next.mock.calls.length === 1;
    };

    beforeEach(() => {
      (controller as any).config = { basic_auth: { ...shippedBasicAuth, scopedRoutes: true } };
      responseError = jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
    });

    it('should ship with scopedRoutes off', () => {
      expect(shippedBasicAuth.scopedRoutes).toBe(false);
    });

    it('should only name real basicAuth routes and methods of routes.ts', () => {
      for (const rule of shippedBasicAuth.protectedRoutes.filter((r) => r.route !== '/some/protected-route')) {
        const methods = [].concat((rule as any).methods || (rule as any).method);
        expect(methods.length).toBeGreaterThan(0);
        for (const method of methods) {
          expect(routes[`${method} ${rule.route}`]).toBeDefined();
          expect(routes[`${method} ${rule.route}`].basicAuth).toBe(true);
        }
      }
    });

    it('should allow admin-api and event on their routes', async () => {
      for (const [user, list] of Object.entries(callerRoutes)) {
        for (const [method, path] of list) {
          expect(await check(user, method, path)).toBe(true);
        }
      }
      expect(responseError).not.toHaveBeenCalled();
    });

    it('should deny admin-api and event on each other routes, and on any other basicAuth route', async () => {
      expect(await check('admin-api', 'POST', '/tasks/by-other-system')).toBe(false);
      expect(await check('event', 'DELETE', '/register/cache')).toBe(false);
      expect(await check('event', 'GET', '/unit-access')).toBe(false);
      const covered = new Set(
        Object.values(callerRoutes)
          .flat()
          .map(([method, path]) => `${method} ${path}`),
      );
      for (const [key, route] of Object.entries(routes) as [string, any][]) {
        if (!route.basicAuth || covered.has(key)) {
          continue;
        }
        const [method, path] = key.split(' ');
        for (const user of Object.keys(callerRoutes)) {
          expect(await check(user, method, path)).toBe(false);
        }
      }
    });

    it('should deny a user without a rule on a ruled route', async () => {
      expect(ruleFor('/tasks/by-other-system')).toHaveLength(1);
      expect(await check('some-external-system', 'POST', '/tasks/by-other-system')).toBe(false);
    });
  });

  describe('getCheckMiddleware with cached user data', () => {
    const cachedUserData = {
      authUserInfo: { userId: 'user-1', role: 'individual' },
      authUserId: 'user-1',
      authUserRoles: ['individual'],
      authUserUnitEntities: { head: [], member: [{ id: 1 }], all: [{ id: 1 }] },
    };

    beforeEach(() => {
      (global as any).log = { save: jest.fn() };
      (global as any).redisClient = { get: jest.fn().mockResolvedValue(JSON.stringify(cachedUserData)), set: jest.fn() };
      (controller as any).config = { auth: { allowedTestAuth: false }, test_users: { list: [] } };
      (controller as any).access = { allowableUnits: [], routeGroupsExceptions: ['public'] };
      (controller as any).userAccess = { checkAccess: jest.fn().mockResolvedValue({ isAllowed: true }) };
      (controller as any).onboardingController = { execute: jest.fn() };
      (controller as any).token = { decrypt: jest.fn().mockReturnValue({ authTokens: { accessToken: 'access', refreshToken: 'refresh' } }) };
      jest.spyOn(controller, 'getRequestUserUnits').mockRestore();
      jest.spyOn(controller, 'responseError').mockImplementation(async () => undefined as any);
      jest.spyOn(controller as any, 'appendTraceMeta').mockImplementation(() => undefined);
    });

    afterEach(() => {
      delete (global as any).redisClient;
    });

    async function run(roles: string[], groups: string[]) {
      const req: any = { headers: { token: 'session-token' } };
      const next = jest.fn();
      await controller.getCheckMiddleware(roles, groups)(req, {}, next);
      return { next };
    }

    it('should pass when the cached user has one of the needed roles', async () => {
      const { next } = await run(['individual'], []);

      expect((global as any).redisClient.get).toHaveBeenCalledTimes(1);
      expect(controller.responseError).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should decline a route that needs a role the cached user does not have', async () => {
      const { next } = await run(['monitoring'], []);

      expect((global as any).redisClient.get).toHaveBeenCalledTimes(1);
      expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), 'User without needed role.', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should decline a cached user from outside of the allowable units', async () => {
      (controller as any).access = { allowableUnits: [2], routeGroupsExceptions: ['public'] };

      const { next } = await run(['individual'], ['some-group']);

      expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), 'forbidden', 403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
