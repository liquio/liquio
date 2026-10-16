import { AuthController } from './auth';
import { Token } from '../lib/token';

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
});
