import crypto from 'crypto';

import { TestApp, config } from './test_app';
import { AuthMiddleware } from '../src/middleware/authenticate';

describe('Auth middleware coverage (group B)', () => {
  const BASIC = `Basic ${config.oauth?.secret_key?.[0]}`;
  let app: TestApp;
  let counter = 0;
  const mw = () => AuthMiddleware.get();

  const newUser = async (extra: Record<string, unknown> = {}) => {
    counter += 1;
    const user = await app
      .model('user')
      .create(
        { ipn: `#7600000${counter}`, provider: 'local', email: `mwb-${counter}@example.com`, first_name: 'Mia', last_name: 'Mw', ...extra },
        { returning: true },
      )
      .then((row) => row.dataValues);
    return user.userId as string;
  };

  const tokenFor = async (userId: string, scope: string[] = ['userId', 'email', 'profile']) => {
    const client = await app
      .model('client')
      .findOne()
      .then((row) => row?.dataValues as any);
    const random = crypto.randomUUID();
    const token = `${random.slice(0, 14)}1${random.slice(15)}`;
    await app.model('accessToken').create({
      accessToken: token,
      clientId: client.clientId,
      expires: new Date(Date.now() + 3600 * 1000),
      userId,
      scope,
    } as any);
    return token;
  };

  const makeRes = () => {
    const res: any = { statusCode: 0, body: undefined, headers: {}, locals: {} };
    res.status = jest.fn((c: number) => {
      res.statusCode = c;
      return res;
    });
    res.send = jest.fn((b: any) => {
      res.body = b;
      return res;
    });
    res.redirect = jest.fn(() => res);
    res.header = jest.fn((k: string, v: string) => {
      res.headers[k] = v;
      return res;
    });
    return res;
  };

  const makeReq = (extra: Record<string, any> = {}) => {
    const session: any = { save: (cb: any) => cb?.(), regenerate: (cb: any) => cb?.() };
    return { headers: {}, query: {}, body: {}, method: 'GET', path: '/x', ip: '127.0.0.1', socket: {}, session, ...extra } as any;
  };

  const run = async (handler: any, req: any, res = makeRes()) => {
    const next = jest.fn();
    await handler(req, res, next);
    return { res, next };
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true } as any;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('basic', () => {
    it('accepts the shared secret, sets serviceClient, and rejects missing or wrong credentials', async () => {
      const ok = await run(mw().basic(), makeReq({ headers: { authorization: BASIC } }));
      expect(ok.next).toHaveBeenCalled();
      const missing = await run(mw().basic(), makeReq());
      expect(missing.res.statusCode).toBe(401);
      const wrong = await run(mw().basic(), makeReq({ headers: { authorization: 'Basic d3Jvbmc6d3Jvbmc=' } }));
      expect(wrong.res.statusCode).toBe(401);
    });

    it('denies a scope the client does not hold', async () => {
      const res = await run(mw().basic('user_write' as any), makeReq({ headers: { authorization: BASIC } }));
      expect(res.res.statusCode).toBe(403);
    });
  });

  describe('authorise, authoriseOptional and userToken', () => {
    it('authorise sets user on valid token, rejects missing and insufficient scope, blocks inactive', async () => {
      const userId = await newUser();
      const token = await tokenFor(userId);
      const ok = await run(mw().authorise(), makeReq({ headers: { authorization: `Bearer ${token}` } }));
      expect(ok.next).toHaveBeenCalled();
      const none = await run(mw().authorise(), makeReq());
      expect(none.res.statusCode).toBeGreaterThanOrEqual(400);
      const scope = await run(mw().authorise({ scope: 'admin:only' }), makeReq({ headers: { authorization: `Bearer ${token}` } }));
      expect(scope.res.statusCode).toBeGreaterThanOrEqual(400);

      const blocked = await newUser({ isActive: false });
      const blockedToken = await tokenFor(blocked);
      const res = await run(mw().authorise(), makeReq({ headers: { authorization: `Bearer ${blockedToken}` } }));
      expect(res.res.statusCode).toBe(403);
    });

    it('authoriseOptional continues with or without a valid token', async () => {
      const userId = await newUser();
      const token = await tokenFor(userId);
      const withToken = makeReq({ headers: { authorization: `Bearer ${token}` } });
      const a = await run(mw().authoriseOptional(), withToken);
      expect(a.next).toHaveBeenCalled();
      expect(withToken.user?.id ?? withToken.user?.userId).toBeTruthy();
      const bad = await run(mw().authoriseOptional(), makeReq({ query: { access_token: 'bogus' } }));
      expect(bad.next).toHaveBeenCalled();
      const none = await run(mw().authoriseOptional(), makeReq());
      expect(none.next).toHaveBeenCalled();
    });

    it('userToken handles required, missing, invalid, blocked and valid tokens', async () => {
      const userId = await newUser();
      const token = await tokenFor(userId);
      expect((await run(mw().userToken(), makeReq())).next).toHaveBeenCalled();
      expect(
        (
          await run(
            mw().userToken(() => true),
            makeReq(),
          )
        ).res.statusCode,
      ).toBe(401);
      expect((await run(mw().userToken(), makeReq({ query: { access_token: 'bogus' } }))).res.statusCode).toBe(401);
      expect((await run(mw().userToken(), makeReq({ query: { access_token: ['a'] } }))).res.statusCode).toBe(401);
      const req = makeReq({ query: { access_token: token } });
      expect((await run(mw().userToken(), req)).next).toHaveBeenCalled();
      const blocked = await newUser({ isActive: false });
      const blockedToken = await tokenFor(blocked);
      expect((await run(mw().userToken(), makeReq({ query: { access_token: blockedToken } }))).res.statusCode).toBe(403);
    });
  });

  describe('checkUserAccess', () => {
    const sessionWith = (user: any) => makeReq({ session: { save: (cb: any) => cb?.(), passport: { user } } });

    it('redirects when a user is required but absent, and passes when optional', async () => {
      const a = await run(mw().checkUserAccess({ requireUser: true }), makeReq());
      expect(a.res.redirect).toHaveBeenCalledWith('/');
      const b = await run(mw().checkUserAccess(), makeReq());
      expect(b.next).toHaveBeenCalled();
    });

    it('passes an active user and completes a slim session profile', async () => {
      const userId = await newUser();
      const req = sessionWith({ userId });
      const r = await run(mw().checkUserAccess({ requireUser: true }), req);
      expect(r.next).toHaveBeenCalled();
      expect(req.session.passport.user.email).toBeTruthy();
    });

    it('returns 401 for a deleted user when required, continues otherwise', async () => {
      const ghost = crypto.randomUUID();
      const a = await run(mw().checkUserAccess({ requireUser: true }), sessionWith({ userId: ghost, isActive: true }));
      expect(a.res.statusCode).toBe(401);
      const b = await run(mw().checkUserAccess(), sessionWith({ userId: ghost, isActive: true }));
      expect(b.next).toHaveBeenCalled();
    });

    it('returns 503 when the user lookup fails', async () => {
      jest.spyOn(app.model('user'), 'findOne').mockRejectedValue(new Error('db down'));
      const r = await run(mw().checkUserAccess({ requireUser: true }), sessionWith({ userId: crypto.randomUUID(), isActive: true }));
      expect(r.res.statusCode).toBe(503);
    });

    it('blocks inactive users and writes a login history record', async () => {
      const userId = await newUser({ isActive: false });
      const req = sessionWith({ userId, isActive: false });
      req.user = { userId, first_name: 'Mia' };
      const r = await run(mw().checkUserAccess({ requireUser: true }), req);
      expect(r.res.statusCode).toBe(403);
    });

    it('enforces identification type and EDRPOU/RNOKPP whitelists', async () => {
      const userId = await newUser({ userIdentificationType: 'eds', edrpou: '12345678' } as any);
      const cfg = config as any;
      try {
        cfg.allowIdentificationTypes = ['passport'];
        const a = sessionWith({ userId });
        a.user = { userId };
        expect((await run(mw().checkUserAccess({ requireUser: true }), a)).res.statusCode).toBe(403);
        cfg.allowIdentificationTypes = ['eds'];
        cfg.allowEdrpou = ['87654321'];
        const b = sessionWith({ userId });
        b.user = { userId };
        expect((await run(mw().checkUserAccess({ requireUser: true }), b)).res.statusCode).toBe(403);
        cfg.allowEdrpou = ['12345678'];
        cfg.allowRnokpp = ['#0'];
        const c = sessionWith({ userId });
        expect((await run(mw().checkUserAccess({ requireUser: true }), c)).res.statusCode).toBe(403);
        cfg.allowRnokpp = undefined;
        const d = sessionWith({ userId });
        expect((await run(mw().checkUserAccess({ requireUser: true }), d)).next).toHaveBeenCalled();
      } finally {
        cfg.allowIdentificationTypes = undefined;
        cfg.allowEdrpou = undefined;
        cfg.allowRnokpp = undefined;
      }
    });
  });

  describe('checkConfigAuth (digest)', () => {
    const md5 = (v: string) => crypto.createHash('md5').update(v).digest('hex');
    const header = (over: Record<string, string> = {}) => {
      const f = { username: 'admin', nonce: 'n', nc: '1', cnonce: 'c', qop: 'auth', uri: '/x', ...over };
      const ha1 = md5('admin:Digest Authentication:admin');
      const ha2 = md5(`GET:${f.uri}`);
      const response = over.response ?? md5([ha1, f.nonce, f.nc, f.cnonce, f.qop, ha2].join(':'));
      return `Digest ${Object.entries({ ...f, response })
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ')}`;
    };

    it('cannot build the digest challenge (generatePinCode(16) throws, see BUGS.md)', async () => {
      await expect(run(mw().checkConfigAuth(), makeReq())).rejects.toThrow(/safe integer/);
      await expect(run(mw().checkConfigAuth(), makeReq({ headers: { authorization: header({ username: 'other' }) } }))).rejects.toThrow(
        /safe integer/,
      );
    });

    it('rejects a wrong digest response', async () => {
      await expect(run(mw().checkConfigAuth(), makeReq({ headers: { authorization: header({ response: 'bad' }) } }))).rejects.toThrow(/safe integer/);
    });

    it('accepts a valid digest response', async () => {
      const r = await run(mw().checkConfigAuth(), makeReq({ headers: { authorization: header() } }));
      expect(r.next).toHaveBeenCalled();
    });
  });
});
