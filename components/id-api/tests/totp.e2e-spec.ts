import crypto from 'crypto';

import { TestApp, config } from './test_app';
import { TOTP } from '../src/lib/totp';
import { Services } from '../src/services';

describe('TOTP enable/generate authorization (KS-31)', () => {
  let app: TestApp;
  let counter = 0;

  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  const NO_SCOPE = `Basic ${Buffer.from('no-totp:no-totp-s3cret').toString('base64')}`;

  const newUser = async (data: Record<string, unknown> = {}) => {
    counter += 1;
    return app
      .model('user')
      .create(
        { ipn: `#99000000${counter}`, provider: 'local', email: `totp-ks31-${counter}@example.com`, role: 'individual', ...data },
        { returning: true },
      )
      .then((row) => row.dataValues);
  };
  const reload = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const generate = (userId: string, authorization = LEGACY) =>
    app.request().get('/totp/generate').query({ userId }).set('Authorization', authorization);
  const enable = (body: Record<string, unknown>, authorization = LEGACY) =>
    app.request().post('/totp/enable').set('Authorization', authorization).send(body);
  const disable = (body: Record<string, unknown>) => app.request().post('/totp/disable').set('Authorization', LEGACY).send(body);
  const makeToken = async (userId: string) => {
    const client = await app
      .model('client')
      .findOne()
      .then((row) => row?.dataValues as any);
    const random = crypto.randomUUID();
    const accessToken = `${random.slice(0, 14)}1${random.slice(15)}`;
    await app
      .model('accessToken')
      .create({ accessToken, clientId: client.clientId, expires: new Date(Date.now() + 3600 * 1000), userId, scope: ['userId'] } as any);
    return accessToken;
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.basic_auth = {
      allowLegacySharedSecret: true,
      clients: [{ name: 'no-totp', secret: 'no-totp-s3cret', scopes: ['user:read'] }],
    };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('rejects a client without the totp scope', async () => {
    const user = await newUser();
    await generate(user.userId, NO_SCOPE).expect(403);
    await enable({ userId: user.userId, code: '123456' }, NO_SCOPE).expect(403);
  });

  it('does not enable a secret chosen by the caller', async () => {
    const user = await newUser();
    const secret = TOTP.createSecret();
    const code = new TOTP(secret).generate();

    // No generate call: nothing is pending.
    await enable({ userId: user.userId, secret, code }).expect(400);
    expect((await reload(user.userId)).useTwoFactorAuth).toBeFalsy();
    expect(await app.model('userTotpSecret').findOne({ where: { userId: user.userId } })).toBeNull();

    // Generate stores another secret: a code for the caller's own secret is refused.
    const generated = await generate(user.userId).expect(201);
    expect(generated.body.secret).not.toBe(secret);
    await enable({ userId: user.userId, secret, code }).expect(401);
    expect((await reload(user.userId)).useTwoFactorAuth).toBeFalsy();
  });

  it('enables the generated secret, ignores a body secret, audits and revokes other sessions', async () => {
    const user = await newUser();
    const keep = await makeToken(user.userId);
    const other = await makeToken(user.userId);
    const generated = await generate(user.userId).expect(201);
    const evil = TOTP.createSecret();

    await enable({ userId: user.userId, secret: evil, code: new TOTP(generated.body.secret).generate(), access_token: keep }).expect(201);

    const stored = await app.model('userTotpSecret').findOne({ where: { userId: user.userId } });
    expect(stored?.dataValues.secret).toBe(generated.body.secret);
    const updated = await reload(user.userId);
    expect(updated.useTwoFactorAuth).toBe(true);
    expect(updated.twoFactorType).toBe('totp');

    const tokens = await app
      .model('accessToken')
      .findAll({ where: { userId: user.userId } })
      .then((rows) => rows.map((row) => row.dataValues.accessToken));
    expect(tokens).toContain(keep);
    expect(tokens).not.toContain(other);

    const actions = await app.model('userAdminAction').findAll({ where: { user_id: user.userId } });
    expect(actions).toHaveLength(1);
    expect(actions[0].dataValues.created_by).toEqual({ service: 'legacy-shared-secret' });

    // The pending secret is consumed.
    await enable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(400);
  });

  it('keeps all sessions when the caller does not name the one to keep', async () => {
    const user = await newUser();
    const token = await makeToken(user.userId);
    const generated = await generate(user.userId).expect(201);
    await enable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(201);
    expect(await app.model('accessToken').findOne({ where: { accessToken: token } })).not.toBeNull();
  });

  it('refuses an expired pending secret', async () => {
    const user = await newUser();
    const generated = await generate(user.userId).expect(201);
    const redis = Services.service('redis');
    await redis.delete(redis.createKey('totp-pending', user.userId));
    await enable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(400);
    expect((await reload(user.userId)).useTwoFactorAuth).toBeFalsy();
  });

  it('rate-limits wrong codes', async () => {
    const user = await newUser();
    const generated = await generate(user.userId).expect(201);
    const max = Services.service('passwordManager').maxAttempts;
    for (let i = 0; i < max; i += 1) {
      await enable({ userId: user.userId, code: '000000' }).expect(401);
    }
    await enable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(429);
    expect((await reload(user.userId)).useTwoFactorAuth).toBeFalsy();
  });

  it('still needs a valid OTP to disable', async () => {
    const user = await newUser();
    const generated = await generate(user.userId).expect(201);
    await enable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(201);

    await disable({ userId: user.userId, code: '000000' }).expect(401);
    expect((await reload(user.userId)).useTwoFactorAuth).toBe(true);
    await disable({ userId: user.userId, code: new TOTP(generated.body.secret).generate() }).expect(201);
    expect((await reload(user.userId)).useTwoFactorAuth).toBe(false);
  });
});
