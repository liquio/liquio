import { TOTP } from '../lib/totp';
import { Models } from '../models';
import { Services } from '../services';
import { TotpController } from './totp.controller';

jest.mock('../middleware/authenticate', () => ({ AuthMiddleware: { get: jest.fn().mockReturnValue({}) } }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, getTraceId: jest.fn(), appendTraceMeta: jest.fn() };
});

describe('TotpController.verifyTotp brute-force protection', () => {
  const MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 3600;
  const secret = TOTP.createSecret();

  let controller: TotpController;
  let counters: Map<string, number>;
  let redis: { createKey: jest.Mock; increment: jest.Mock; delete: jest.Mock };

  const newRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }) as any;
  const newReq = (code: unknown, userId: string | null) =>
    ({ body: { code }, session: { passport: userId ? { user: { userId } } : undefined } }) as any;
  const wrongCode = () => {
    const valid = new TOTP(secret).generate();
    return valid === '000000' ? '111111' : '000000';
  };

  beforeEach(() => {
    jest.clearAllMocks();
    counters = new Map();
    redis = {
      createKey: jest.fn((...args: string[]) => args.join('.')),
      // Atomic like redis INCRBY: no await between the read and the write.
      increment: jest.fn(async (key: string) => {
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return next;
      }),
      delete: jest.fn(async (key: string) => Number(counters.delete(key))),
    };
    const findOne = jest.fn(async (query: any) => {
      if (query.attributes) return { dataValues: { userId: 'u1', useTwoFactorAuth: true, twoFactorType: 'totp' } };
      return { dataValues: { userId: 'u1', secret } };
    });
    (Models.model as jest.Mock).mockReturnValue({ findOne });
    (Services.service as jest.Mock).mockImplementation((name: string) =>
      name === 'redis' ? redis : { maxAttempts: MAX_ATTEMPTS, maxAttemptDelay: LOCK_SECONDS },
    );
    controller = new TotpController({ get: jest.fn(), post: jest.fn() } as any, { config: {} } as any);
  });

  const attempt = async (code: unknown, userId?: string | null) => {
    const req = newReq(code, userId === undefined ? 'u1' : userId);
    const res = newRes();
    await controller.verifyTotp(req, res);
    return { req, res, status: res.status.mock.calls[0]?.[0] as number };
  };

  it('counts failed attempts per user with the configured lock duration', async () => {
    await attempt(wrongCode());

    expect(redis.createKey).toHaveBeenCalledWith('auth-totp', 'u1');
    expect(redis.increment).toHaveBeenCalledWith('auth-totp.u1', 1, LOCK_SECONDS);
  });

  it('answers 401 to the failed attempts up to the limit and 429 after it', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect((await attempt(wrongCode())).status).toBe(401);
    }

    expect((await attempt(wrongCode())).status).toBe(429);
  });

  it('rejects a valid code while the user is locked and does not mark the session complete', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) await attempt(wrongCode());

    const { req, status, res } = await attempt(new TOTP(secret).generate());

    expect(status).toBe(429);
    expect(res.send).toHaveBeenCalledWith({ error: 'Too many attempts. Please try again later.' });
    expect(req.session.twoFactorCompleted).toBeUndefined();
    expect(req.session.passport.user.totpChecked).toBeUndefined();
  });

  it('does not exceed the limit with concurrent attempts', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => attempt(wrongCode())));

    expect(results.filter((r) => r.status === 401)).toHaveLength(MAX_ATTEMPTS);
    expect(results.filter((r) => r.status === 429)).toHaveLength(20 - MAX_ATTEMPTS);
  });

  it('allows the user again once the lock expires', async () => {
    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) await attempt(wrongCode());
    counters.clear(); // The redis key expired.

    const { status, req } = await attempt(new TOTP(secret).generate());

    expect(status).toBe(200);
    expect(req.session.twoFactorCompleted).toEqual({ userId: 'u1', factor: 'totp' });
  });

  it('resets the counter only after a valid code', async () => {
    await attempt(wrongCode());
    await attempt(wrongCode());
    expect(redis.delete).not.toHaveBeenCalled();

    const { status } = await attempt(new TOTP(secret).generate());

    expect(status).toBe(200);
    expect(redis.delete).toHaveBeenCalledWith('auth-totp.u1');
    expect(counters.has('auth-totp.u1')).toBe(false);
  });

  it('keeps counting separately for every user', async () => {
    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) await attempt(wrongCode());

    expect(redis.increment).not.toHaveBeenCalledWith('auth-totp.u2', expect.anything(), expect.anything());
    expect(counters.get('auth-totp.u1')).toBe(MAX_ATTEMPTS + 1);
  });

  it('rejects non-string codes without counting or validating them', async () => {
    for (const code of [['000000'], { $ne: 1 }, 123456, undefined]) {
      expect((await attempt(code)).status).toBe(400);
    }

    expect(redis.increment).not.toHaveBeenCalled();
  });

  it('answers 401 without a session user and does not count', async () => {
    expect((await attempt('000000', null)).status).toBe(401);

    expect(redis.increment).not.toHaveBeenCalled();
  });
});

describe('TotpController user binding (KS-31b)', () => {
  const secret = TOTP.createSecret();
  let controller: TotpController;
  let router: { get: jest.Mock; post: jest.Mock };
  let userToken: jest.Mock;
  let config: any;

  const newRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    userToken = jest.fn().mockReturnValue('user-token-middleware');
    const { AuthMiddleware } = jest.requireMock('../middleware/authenticate');
    AuthMiddleware.get.mockReturnValue({ basic: jest.fn().mockReturnValue('basic'), userToken });
    router = { get: jest.fn(), post: jest.fn() };
    config = { auth_providers: {} };
    const redis = {
      createKey: jest.fn((...args: string[]) => args.join('.')),
      get: jest.fn().mockResolvedValue(secret),
      set: jest.fn().mockResolvedValue(true),
      increment: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(1),
    };
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'redis' ? redis : { maxAttempts: 5, maxAttemptDelay: 60 }));
    (Models.model as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    });
    controller = new TotpController(router as any, { config } as any);
    (controller as any).registerRoutes();
  });

  it('wires the user token middleware after basic auth on all three routes', () => {
    expect(router.get.mock.calls[0].slice(1)).toEqual([expect.anything(), 'basic', 'user-token-middleware', expect.any(Function)]);
    expect(router.post.mock.calls.filter(([path]) => /^\/totp\//.test(path)).map((c) => c.slice(1, 3))).toEqual([
      ['basic', 'user-token-middleware'],
      ['basic', 'user-token-middleware'],
    ]);
  });

  it('requires the token only when auth_providers.totp.requireUserToken is true', () => {
    const required = userToken.mock.calls[0][0] as () => boolean;
    expect(required()).toBe(false);
    config.auth_providers.totp = { requireUserToken: true };
    expect(required()).toBe(true);
  });

  it.each([
    ['enable', (req: any, res: any) => controller.enableTotpSecret(req, res), { body: { userId: 'victim', code: '123456' } }],
    ['disable', (req: any, res: any) => controller.disableTotpSecret(req, res), { body: { userId: 'victim', code: '123456' } }],
  ])('%s answers 403 when the body userId differs from the token user', async (_name, call, req) => {
    const res = newRes();
    await call({ ...req, user: { id: 'me' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Models.model).not.toHaveBeenCalled();
  });

  it('takes the userId from the token when the body has none', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    (Models.model as jest.Mock).mockReturnValue({ findOne });
    const res = newRes();
    await controller.enableTotpSecret({ body: { code: '123456' }, user: { id: 'me' } } as any, res);
    expect(findOne).toHaveBeenCalledWith({ where: { userId: 'me' } });
  });

  it('keeps the legacy body userId when no token is bound, and 400 when there is none', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    (Models.model as jest.Mock).mockReturnValue({ findOne });
    await controller.enableTotpSecret({ body: { userId: 'legacy', code: '123456' } } as any, newRes());
    expect(findOne).toHaveBeenCalledWith({ where: { userId: 'legacy' } });

    const res = newRes();
    await controller.disableTotpSecret({ body: { code: '123456' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
