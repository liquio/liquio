const mockLog = { save: jest.fn() };
const mockServices: Record<string, any> = {};
const mockModels: Record<string, any> = {};
const mockQuery = jest.fn();

jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
    service(name: string) {
      return mockServices[name];
    }
    model(name: string) {
      return mockModels[name];
    }
  },
}));
jest.mock('../lib/oauth_model', () => ({ OAuthModel: class MockOAuthModel {} }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn(), db: { query: (...args: any[]) => mockQuery(...args) } } }));
jest.mock('@node-oauth/oauth2-server', () => {
  class MockOAuth2Server {}
  return { __esModule: true, default: MockOAuth2Server, InvalidClientError: Error, OAuthError: Error, Request: class {}, Response: class {} };
});

import { Op } from 'sequelize';

import { AuthService } from './auth.service';

describe('AuthService.incrementConfirmCodeCounterAsync (ID-21)', () => {
  let auth: AuthService;
  let rows: { phone: string; counter: number; active: boolean }[];
  let destroy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [{ phone: '+380501', counter: 0, active: true }];
    // One atomic UPDATE ... RETURNING: no await between the read and the write.
    mockQuery.mockImplementation(async (_sql: string, { replacements }: any) => {
      const hit = rows.filter((r) => r.phone === replacements.recipient && r.active);
      hit.forEach((r) => (r.counter += 1));
      return [hit.map((r) => ({ counter: r.counter })), hit.length];
    });
    destroy = jest.fn(async () => 1);
    mockModels.confirmCode = { destroy };
    auth = new AuthService({ confirmCodeRetries: 3 } as any, {} as any, {} as any);
  });

  it('does not lose increments under concurrent failures', async () => {
    const results = await Promise.all([1, 2, 3].map(() => auth.incrementConfirmCodeCounterAsync({ phone: '+380501' })));

    expect(rows[0].counter).toBe(3);
    expect([...results].sort()).toEqual([1, 2, 3]);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('deletes the codes (awaited) once the counter exceeds the retry limit', async () => {
    rows[0].counter = 3;
    let finished = false;
    destroy.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      finished = true;
      return 1;
    });

    const counter = await auth.incrementConfirmCodeCounterAsync({ phone: '+380501' });

    expect(counter).toBe(4);
    expect(destroy).toHaveBeenCalledWith({ where: { phone: '+380501', counter: { [Op.gt]: 3 } } });
    expect(finished).toBe(true);
  });

  it('does not touch anything when the code is absent or expired', async () => {
    rows[0].active = false;

    expect(await auth.incrementConfirmCodeCounterAsync({ phone: '+380501' })).toBeNull();
    expect(await auth.incrementConfirmCodeCounterAsync({ phone: '+380999' })).toBeNull();
    expect(rows[0].counter).toBe(0);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('requires an email or a phone', async () => {
    await expect(auth.incrementConfirmCodeCounterAsync({})).rejects.toThrow('Email or phone should be defined.');
  });
});

describe('AuthService.consumeSendQuota (ID-20)', () => {
  const build = (sendLimit: any, redis: any) => {
    mockServices.redis = redis;
    return new AuthService({ confirmCode: { ttlMinutes: 60, sendLimit } } as any, {} as any, {} as any);
  };
  const memoryRedis = () => {
    const counters = new Map<string, number>();
    return {
      counters,
      incrementWindow: jest.fn(async ([key]: string[], _windowSeconds?: number) => {
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return next;
      }),
    };
  };

  beforeEach(() => jest.clearAllMocks());

  it('allows up to the recipient limit and rejects after it, concurrently too', async () => {
    const auth = build({ recipientMax: 2, sourceMax: 100 }, memoryRedis());

    const results = await Promise.all([1, 2, 3, 4].map(() => auth.consumeSendQuota('phone', '+380501', '1.1.1.1')));

    expect(results.filter(Boolean)).toHaveLength(2);
  });

  it('normalizes the recipient key (email case, phone formatting) and stores no plain recipient', async () => {
    const redis = memoryRedis();
    const auth = build({ recipientMax: 1, sourceMax: 100 }, redis);

    expect(await auth.consumeSendQuota('email', 'User@Example.com', '1.1.1.1')).toBe(true);
    expect(await auth.consumeSendQuota('email', ' user@example.com ', '2.2.2.2')).toBe(false);
    expect(await auth.consumeSendQuota('phone', '+38 (050) 111', '1.1.1.1')).toBe(true);
    expect(await auth.consumeSendQuota('phone', '38050111', '3.3.3.3')).toBe(false);
    for (const key of redis.counters.keys()) {
      expect(key).not.toContain('example.com');
      expect(key).not.toContain('050');
    }
  });

  it('keeps recipients and channels independent', async () => {
    const auth = build({ recipientMax: 1, sourceMax: 100 }, memoryRedis());

    expect(await auth.consumeSendQuota('phone', '380501', 'a')).toBe(true);
    expect(await auth.consumeSendQuota('phone', '380502', 'a')).toBe(true);
    expect(await auth.consumeSendQuota('email', '380501', 'a')).toBe(true);
  });

  it('limits a source that rotates recipients', async () => {
    const auth = build({ recipientMax: 5, sourceMax: 2 }, memoryRedis());

    expect(await auth.consumeSendQuota('phone', '1', 'ip')).toBe(true);
    expect(await auth.consumeSendQuota('email', 'a@b.c', 'ip')).toBe(true);
    expect(await auth.consumeSendQuota('phone', '2', 'ip')).toBe(false);
    expect(await auth.consumeSendQuota('phone', '2', 'other-ip')).toBe(true);
  });

  it('passes the configured window to redis and has generous defaults', async () => {
    const redis = memoryRedis();
    const auth = build({ recipientWindowSeconds: 77 }, redis);

    for (let i = 0; i < 10; i++) expect(await auth.consumeSendQuota('phone', '1', 'ip')).toBe(true);
    expect(await auth.consumeSendQuota('phone', '1', 'ip')).toBe(false);
    expect(redis.incrementWindow.mock.calls[0][1]).toBe(77);
  });

  it('falls back to a per-instance fixed window when redis is disabled, and resets after the window', async () => {
    const auth = build({ recipientMax: 1, recipientWindowSeconds: 60 }, { incrementWindow: jest.fn(async () => null) });
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);

    expect(await auth.consumeSendQuota('phone', '1')).toBe(true);
    expect(await auth.consumeSendQuota('phone', '1')).toBe(false);
    now.mockReturnValue(1_000_000 + 61_000);
    expect(await auth.consumeSendQuota('phone', '1')).toBe(true);
    now.mockRestore();
  });
});
