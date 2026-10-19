import { TestApp, config } from './test_app';

describe('Named service clients on basic() routes (KS-24)', () => {
  let app: TestApp;
  let counter = 0;

  const basic = (name: string, secret: string) => `Basic ${Buffer.from(`${name}:${secret}`).toString('base64')}`;
  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  const WRITER = basic('writer', 'writer-s3cret');
  const ADMIN = basic('admin-service', 'admin-s3cret');
  const READER = basic('reader', 'reader-s3cret');

  const newUser = async (data: Record<string, unknown> = {}) => {
    counter += 1;
    return app
      .model('user')
      .create(
        { ipn: `#98000000${counter}`, provider: 'local', email: `service-client-${counter}@example.com`, role: 'individual', ...data },
        { returning: true },
      )
      .then((row) => row.dataValues);
  };

  const update = (userId: string, authorization: string, body: Record<string, unknown>) =>
    app.request().put(`/user/info/${userId}`).set('Authorization', authorization).send(body);

  const reload = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const actions = (userId: string) =>
    app
      .model('userAdminAction')
      .findAll({ where: { user_id: userId } })
      .then((rows) => rows.map((row) => row.dataValues));

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.basic_auth = {
      allowLegacySharedSecret: true,
      clients: [
        { name: 'writer', secret: 'writer-s3cret', scopes: ['user:read', 'user:write'] },
        {
          name: 'admin-service',
          secret_hash: require('crypto').createHash('sha256').update('admin-s3cret').digest('hex'),
          scopes: ['user:read', 'user:write', 'user:admin'],
        },
        { name: 'reader', secret: 'reader-s3cret', scopes: ['totp'] },
      ],
    };
    config.roles = ['individual', 'admin'];

    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('rejects a wrong secret, a wrong name and a short secret', async () => {
    const user = await newUser();
    await update(user.userId, basic('writer', 'writer-s3cre'), { gender: 'male' }).expect(401);
    await update(user.userId, basic('other', 'writer-s3cret'), { gender: 'male' }).expect(401);
    await update(user.userId, basic('writer', ''), { gender: 'male' }).expect(401);
  });

  it('returns 403 for a client without the route scope', async () => {
    const user = await newUser();
    await app.request().get(`/user/${user.userId}`).set('Authorization', READER).expect(403);
    await update(user.userId, READER, { gender: 'male' }).expect(403);
    await app.request().get(`/user/${user.userId}`).set('Authorization', WRITER).expect(200);
  });

  it('lets a user:write client update profile fields but not privileged fields, email or phone', async () => {
    const user = await newUser();
    await update(user.userId, WRITER, { gender: 'male' }).expect(200);
    for (const body of [{ role: 'individual;admin' }, { isActive: false }, { useTwoFactorAuth: true }, { twoFactorType: 'totp' }]) {
      await update(user.userId, WRITER, body).expect(403);
    }
    for (const body of [{ email: 'x@example.com' }, { phone: '380501112233' }]) {
      await update(user.userId, ADMIN, body).expect(400);
    }
    const stored = await reload(user.userId);
    expect(stored.gender).toBe('male');
    expect(stored.role).toBe('individual');
    expect(stored.isActive).toBe(true);
    expect(stored.email).toBe(user.email);
  });

  it('lets a user:admin client change an allowed role, audits it with the service name and revokes access', async () => {
    const user = await newUser();
    await app.model('sessions').create({ sid: `sid-${user.userId}`, userId: user.userId, expires: new Date(Date.now() + 60000), data: '{}' } as any);

    const res = await update(user.userId, ADMIN, { role: 'individual;admin', updateInitiator: 'spoofed' }).expect(200);
    expect(res.headers['set-cookie']).toBeUndefined();

    expect((await reload(user.userId)).role).toBe('individual;admin');
    const [row] = await actions(user.userId);
    expect(row.action_type).toBe('update');
    expect(row.created_by).toEqual({ service: 'admin-service' });
    expect((row.data as any).changes).toEqual({ role: 'individual;admin' });
    expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBe(0);
  });

  it('rejects roles outside the allowlist for named clients', async () => {
    const user = await newUser({ useTwoFactorAuth: true, twoFactorType: 'totp' });
    await update(user.userId, ADMIN, { role: 'superuser' }).expect(400);
    await update(user.userId, ADMIN, { role: 'individual;superuser' }).expect(400);
    const stored = await reload(user.userId);
    expect(stored.role).toBe('individual');
    expect(stored.useTwoFactorAuth).toBe(true);
  });

  it('lets a user:admin named client disable 2FA, audited with the service name (ID-09d)', async () => {
    const user = await newUser({ useTwoFactorAuth: true, twoFactorType: 'totp' });
    await update(user.userId, ADMIN, { useTwoFactorAuth: false }).expect(200);
    expect((await reload(user.userId)).useTwoFactorAuth).toBe(false);
    const rows = await actions(user.userId);
    expect(rows.some((row) => (row.data as any).changes?.useTwoFactorAuth === false && (row.created_by as any)?.service === 'admin-service')).toBe(
      true,
    );
  });

  it('audits blocking by a named client with the service name', async () => {
    const user = await newUser();
    await update(user.userId, ADMIN, { isActive: false }).expect(200);
    expect((await reload(user.userId)).isActive).toBe(false);
    const [row] = await actions(user.userId);
    expect(row.action_type).toBe('block');
    expect(row.created_by).toEqual({ service: 'admin-service' });
  });

  it('records the human initiator next to the service for a user:admin client (KS-24m)', async () => {
    const user = await newUser();
    await update(user.userId, ADMIN, { isActive: false, updateInitiator: { userId: 'admin-1', name: 'Admin One', email: 'x@y.test' } }).expect(200);
    const [row] = await actions(user.userId);
    expect(row.created_by).toEqual({ userId: 'admin-1', name: 'Admin One', service: 'admin-service' });
  });

  it('keeps the legacy shared secret working with all scopes and no session or cookie written for the target', async () => {
    const user = await newUser();
    const res = await update(user.userId, LEGACY, { role: 'individual;legacy', isActive: false, updateInitiator: { userId: 'admin-1' } }).expect(200);
    expect(res.text).toBe('ok');
    expect(res.headers['set-cookie']).toBeUndefined();
    const stored = await reload(user.userId);
    expect(stored.role).toBe('individual;legacy');
    expect(stored.isActive).toBe(false);
    const [row] = await actions(user.userId);
    expect(row.created_by).toEqual({ userId: 'admin-1' });
  });

  it('resets valid.email when the legacy shared secret changes the email (GI-06)', async () => {
    const user = await newUser({ valid: { phone: true, email: true } });
    await update(user.userId, LEGACY, { email: 'GI06-changed@example.com' }).expect(200);
    const stored = await reload(user.userId);
    expect(stored.email).toBe('GI06-changed@example.com');
    expect(stored.valid).toEqual({ phone: true, email: false });
  });

  it('keeps valid.email when the legacy shared secret sends the same email (GI-06)', async () => {
    const user = await newUser({ valid: { phone: false, email: true } });
    await update(user.userId, LEGACY, { email: user.email, gender: 'male' }).expect(200);
    expect((await reload(user.userId)).valid).toEqual({ phone: false, email: true });
  });

  it('rejects an email from a named client and leaves valid.email alone (GI-06)', async () => {
    const user = await newUser({ valid: { phone: false, email: true } });
    await update(user.userId, ADMIN, { email: 'gi06-named@example.com' }).expect(400);
    const stored = await reload(user.userId);
    expect(stored.email).toBe(user.email);
    expect(stored.valid).toEqual({ phone: false, email: true });
  });
});
