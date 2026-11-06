import bcrypt from 'bcrypt';

import { TestApp, config } from './test_app';

describe('Logout CSRF protection (ID-19)', () => {
  let app: TestApp;
  let userId: string;
  const email = 'logout-csrf@email';
  const password = 'V4l!dPassW0rd';

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const login = async () => {
    const { headers } = await app.request().post('/authorise/local').send({ email, password }).expect(200);
    return (headers['set-cookie'] as unknown as string[]).map((value) => value.split(';')[0]).join('; ');
  };

  const sessionCount = () => app.model('sessions').count({ where: { userId } });

  it('should setup an app with a local user', async () => {
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    app = await TestApp.setup();

    const user = await app
      .model('user')
      .create({ ipn: '#1234567892', provider: 'local', email }, { returning: true })
      .then((row) => row.dataValues);
    userId = user.userId;
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId,
      data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
    });
  });

  it('should not revoke on a cross-site GET and render a confirmation instead', async () => {
    const cookie = await login();
    expect(await sessionCount()).toBeGreaterThan(0);

    const response = await app.request().get('/logout').set('Cookie', cookie).set('Sec-Fetch-Site', 'cross-site').expect(200);

    expect(response.text).toContain('method="post"');
    expect(response.text).toContain('name="_csrf"');
    expect(await sessionCount()).toBeGreaterThan(0);
  });

  it('should not revoke on a GET with a foreign Origin and no Sec-Fetch-Site', async () => {
    const cookie = await login();

    await app.request().get('/logout').set('Cookie', cookie).set('Origin', 'https://evil.example').expect(200);

    expect(await sessionCount()).toBeGreaterThan(0);
  });

  it('should revoke on a same-site GET navigation and keep the redirect', async () => {
    const cookie = await login();

    const response = await app.request().get('/logout').set('Cookie', cookie).set('Sec-Fetch-Site', 'same-site').redirects(0).expect(302);

    expect(response.headers.location).toBe('/');
    expect(await sessionCount()).toBe(0);
  });

  it('should reject a POST without CSRF proof or with an invalid token', async () => {
    const cookie = await login();

    await app.request().post('/logout').set('Cookie', cookie).set('Sec-Fetch-Site', 'cross-site').expect(403);
    await app
      .request()
      .post('/logout')
      .set('Cookie', cookie)
      .set('Sec-Fetch-Site', 'same-origin')
      .type('form')
      .send({ _csrf: 'invalid' })
      .expect(403);

    expect(await sessionCount()).toBeGreaterThan(0);
  });

  it('should revoke on a POST with the session-bound token from the confirmation page', async () => {
    const cookie = await login();

    const page = await app.request().get('/logout?redirect_uri=/bye').set('Cookie', cookie).set('Sec-Fetch-Site', 'cross-site').expect(200);
    const token = /name="_csrf" value="([0-9a-f]+)"/.exec(page.text)?.[1];
    expect(token).toBeDefined();

    const response = await app
      .request()
      .post('/logout?redirect_uri=/bye')
      .set('Cookie', cookie)
      .set('Sec-Fetch-Site', 'cross-site')
      .type('form')
      .send({ _csrf: token })
      .redirects(0)
      .expect(302);

    expect(response.headers.location).toBe('/bye');
    expect(await sessionCount()).toBe(0);
  });
});
