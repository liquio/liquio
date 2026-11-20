import bcrypt from 'bcrypt';

import { TestApp, config } from './test_app';

describe('Cookie security attributes', () => {
  let app: TestApp;
  const email = 'cookie@email';
  const password = 'V4l!dPassW0rd';

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    delete config.trustProxy;
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const login = (headers: Record<string, string> = {}) => app.request().post('/authorise/local').set(headers).send({ email, password }).expect(200);

  const findCookie = (setCookie: string[], name: string) => setCookie.find((value) => value.startsWith(`${name}=`));

  it('should setup an app with one trusted proxy hop', async () => {
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.trustProxy = 1;
    app = await TestApp.setup();

    const user = await app
      .model('user')
      .create({ ipn: '#1234567891', provider: 'local', email }, { returning: true })
      .then((row) => row.dataValues);
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId: user.userId,
      data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
    });
  });

  it('should set a Secure, HttpOnly, SameSite=Lax session cookie behind a TLS-terminating proxy', async () => {
    const { headers } = await login({ 'X-Forwarded-Proto': 'https' });
    const session = findCookie(headers['set-cookie'] as unknown as string[], 'connect.sid');

    expect(session).toBeDefined();
    expect(session).toContain('HttpOnly');
    expect(session).toContain('Secure');
    expect(session).toContain('SameSite=Lax');
  });

  it('should not mark cookies Secure on plain http so local development keeps working', async () => {
    const { headers } = await login();
    const session = findCookie(headers['set-cookie'] as unknown as string[], 'connect.sid');

    expect(session).toBeDefined();
    expect(session).toContain('HttpOnly');
    expect(session).toContain('SameSite=Lax');
    expect(session).not.toContain('Secure');
  });

  it('should apply Secure and SameSite to the profile cookie', async () => {
    const { headers } = await login({ 'X-Forwarded-Proto': 'https' });
    const cookies = (headers['set-cookie'] as unknown as string[]).map((value) => value.split(';')[0]).join('; ');

    const response = await app.request().get('/authorise/continue').set({ 'X-Forwarded-Proto': 'https' }).set('Cookie', cookies);
    const jwt = findCookie(response.headers['set-cookie'] as unknown as string[], 'jwt');

    expect(jwt).toBeDefined();
    expect(jwt).toContain('Secure');
    expect(jwt).toContain('SameSite=Lax');
  });
});
