import { TestApp, config } from './test_app';

describe('Self sign-up requires email ownership proof (ID-26)', () => {
  const PASSWORD = 'V4l!dPassW0rd-26';
  const CODE = '123456';
  let app: TestApp;
  let next = 0;
  const unique = () => `signup-${next++}@email.test`;

  const seedCode = (email: string, code = CODE, expiresIn = new Date(Date.now() + 60 * 60 * 1000), counter = 0) =>
    app.model('confirmCode').create({ email, code, counter, expiresIn } as any);
  const signUp = (body: Record<string, unknown>) => app.request().post('/sign_up').send(body);
  const findUser = (email: string) => app.model('user').findOne({ where: { email } });
  const login = (email: string, password = PASSWORD) => app.request().post('/authorise/local').send({ email, password });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.signUp = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    config.signUp = { isEnabled: false };
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('creates no account and no credentials without a confirmation code', async () => {
    const email = unique();
    await signUp({ email, password: PASSWORD }).expect(400);
    expect(await findUser(email)).toBeNull();
    await login(email).expect(401);
  });

  it('rejects a wrong code, counts the failed attempt and creates nothing', async () => {
    const email = unique();
    await seedCode(email);
    await signUp({ email, password: PASSWORD, code: '000000' })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid-code'));
    expect(await findUser(email)).toBeNull();
    expect((await app.model('confirmCode').findOne({ where: { email } }))!.dataValues.counter).toBe(1);
  });

  it('rejects an expired code', async () => {
    const email = unique();
    await seedCode(email, CODE, new Date(Date.now() - 60 * 1000));
    await signUp({ email, password: PASSWORD, code: CODE }).expect(400);
    expect(await findUser(email)).toBeNull();
  });

  it('rejects a code issued for another email (email mismatch)', async () => {
    const issued = unique();
    const other = unique();
    await seedCode(issued);
    await signUp({ email: other, password: PASSWORD, code: CODE }).expect(400);
    expect(await findUser(other)).toBeNull();
    expect(await findUser(issued)).toBeNull();
  });

  it('gives the same answer for a wrong code whether or not the email is registered', async () => {
    const registered = unique();
    await app.model('user').create({ ipn: `#reg${next}`, provider: 'local', email: registered } as any);
    const a = await signUp({ email: registered, password: PASSWORD, code: '000000' });
    const b = await signUp({ email: unique(), password: PASSWORD, code: '000000' });
    expect([a.status, a.body]).toEqual([b.status, b.body]);
  });

  it('activates the account with a valid code: email marked valid, code consumed, login works', async () => {
    const email = unique();
    await seedCode(email);
    await signUp({ email: email.toUpperCase(), password: PASSWORD, code: CODE }).expect(201);

    const user = (await findUser(email))!.dataValues;
    expect(user.valid?.email).toBe(true);
    expect(await app.model('confirmCode').count({ where: { email } })).toBe(0);
    await login(email).expect(200);
  });

  it('does not allow the same code to be replayed', async () => {
    const email = unique();
    const other = unique();
    await seedCode(email);
    await signUp({ email, password: PASSWORD, code: CODE }).expect(201);
    await signUp({ email, password: PASSWORD, code: CODE }).expect(400);
    await signUp({ email: other, password: PASSWORD, code: CODE }).expect(400);
    expect(await findUser(other)).toBeNull();
  });

  it('creates a single account when the same code is submitted in parallel', async () => {
    const email = unique();
    await seedCode(email);
    const results = await Promise.all([1, 2, 3].map(() => signUp({ email, password: PASSWORD, code: CODE })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await app.model('user').count({ where: { email } })).toBe(1);
  });
});
