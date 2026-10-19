import { Strategy } from 'passport-local';

import { Models } from '../models';
import { Services } from '../services';
import { local } from './local';

jest.mock('passport-local', () => ({ Strategy: jest.fn() }));
jest.mock('../lib/helpers', () => ({ delay: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn(), destroySession: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance } };
});

describe('local strategy verify', () => {
  let verify: (email: string, password: string, done: jest.Mock) => Promise<void>;
  let passwordManager: any;
  let redis: any;
  let userRow: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    passwordManager = { maxAttempts: 5, maxAttemptDelay: 60, verifyPassword: jest.fn().mockResolvedValue(true) };
    redis = {
      createKey: jest.fn((...args: string[]) => args.join('.')),
      increment: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'passwordManager' ? passwordManager : redis));
    userRow = {
      userId: 'u1',
      email: 'a@b',
      isActive: true,
      user_services: [{ provider: 'local', data: { password: 'hash', oldPasswords: [] } }],
    };
    (Models.model as jest.Mock).mockReturnValue({ findOne: jest.fn().mockResolvedValue({ dataValues: userRow }) });

    const app: any = {
      config: { auth_providers: { local: { isEnabled: true } } },
      passport: { use: jest.fn(), authenticate: jest.fn(), mapping: {} },
      post: jest.fn(),
    };
    await local(app);
    verify = (Strategy as unknown as jest.Mock).mock.calls.slice(-1)[0][1];
  });

  it('creates a session payload for an active user', async () => {
    const done = jest.fn();
    await verify('a@b', 'pw', done);
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ userId: 'u1', provider: 'local' }));
  });

  it('rejects a blocked user with the same generic 401 as a wrong password', async () => {
    const wrong = jest.fn();
    passwordManager.verifyPassword.mockResolvedValueOnce(false);
    await verify('a@b', 'bad', wrong);

    userRow.isActive = false;
    const blocked = jest.fn();
    await verify('a@b', 'pw', blocked);

    expect(blocked).toHaveBeenCalledTimes(1);
    const [err, session] = blocked.mock.calls[0];
    expect(session).toBeUndefined();
    expect(err.status ?? err.statusCode).toBe(wrong.mock.calls[0][0].status ?? wrong.mock.calls[0][0].statusCode);
    expect(err.message).toBe(wrong.mock.calls[0][0].message);
    expect(err.message).toBe('Invalid email or password.');
    expect(redis.delete).not.toHaveBeenCalled();
  });
});

describe('local strategy error logging', () => {
  it('logs only the error message, not the whole error object', async () => {
    const { Log } = jest.requireMock('@liquio/back-core');
    const log = Log.getInstance();
    const secretError: any = new Error('db down');
    secretError.config = { headers: { Authorization: 'Bearer secret' } };
    (Models.model as jest.Mock).mockReturnValue({ findOne: jest.fn().mockRejectedValue(secretError) });
    (Services.service as jest.Mock).mockReturnValue({
      maxAttempts: 5,
      maxAttemptDelay: 60,
      createKey: jest.fn((...a: string[]) => a.join('.')),
      increment: jest.fn().mockResolvedValue(1),
      delete: jest.fn(),
    });
    const app: any = {
      config: { auth_providers: { local: { isEnabled: true } } },
      passport: { use: jest.fn(), authenticate: jest.fn(), mapping: {} },
      post: jest.fn(),
    };
    await local(app);
    const verify = (Strategy as unknown as jest.Mock).mock.calls.slice(-1)[0][1];
    await verify('a@b', 'pw', jest.fn());

    const call = log.save.mock.calls.find((c: any[]) => c[0] === 'user-auth-by-local|error');
    expect(call).toBeDefined();
    expect(call[1]).toEqual({ error: 'db down' });
    expect(JSON.stringify(call[1])).not.toContain('secret');
  });
});
