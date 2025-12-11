import bcrypt from 'bcrypt';

import { TestApp, config } from './test_app';

describe('AuthController - local', () => {
  let app: TestApp;

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

  it('should setup an app successfully', async () => {
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    try {
      app = await TestApp.setup();
    } catch (error: any) {
      throw new Error(`Failed to setup app: ${error.toString()}`);
    }
  });

  describe('User/password Authorization (local)', () => {
    const email = 'valid@email';
    const password = 'V4l!dPassW0rd';
    let cookies: any;
    let userId: string;

    it('should try to login with invalid credentials', async () => {
      await app
        .request()
        .post('/authorise/local')
        .send({ email: 'invalid', password: 'invalid' })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'Invalid email or password.',
          });
        });
    });

    it('should login with correct credentials', async () => {
      const user = await app
        .model('user')
        .create(
          {
            ipn: '#1234567890',
            provider: 'local',
            email,
          },
          { returning: true },
        )
        .then((row) => row.dataValues);

      userId = user.userId;

      await app.model('userServices').create({
        provider: 'local',
        provider_id: email,
        userId,
        data: {
          password: bcrypt.hashSync(password, 1).toString(),
          oldPasswords: [],
          isChangeRequired: true,
        },
      });

      await app
        .request()
        .post('/authorise/local')
        .send({ email, password })
        .expect(200)
        .expect(({ body, headers }) => {
          expect(body).toEqual({ error: null, redirect: '/authorise/continue/' });
          expect(headers['set-cookie']).toBeDefined();
          cookies = headers['set-cookie'];
        });
    });

    it('should redirect to /authorise/continue', async () => {
      await app.request().get('/authorise/continue').set('Cookie', cookies).expect(302);

      const loginHistory = await app
        .model('loginHistory')
        .findOne({ where: { user_id: userId } })
        .then((row) => row?.dataValues);

      expect(loginHistory).toMatchObject({
        action_type: 'login',
        client_id: 'undefined',
        client_name: null,
        created_at: expect.any(Date),
        id: expect.any(String),
        ip: ['::1'],
        is_blocked: false,
        user_agent: null,
        user_id: userId,
        user_name: email,
      });
    });

    it('should be able to change password', async () => {
      await app
        .request()
        .post('/authorise/local/change_password')
        .send({ email, oldPassword: password, newPassword: 'NewP4ssw0!rd' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ success: true });
        });

      const user = await app
        .model('user')
        .findOne({
          where: { email },
          include: [{ model: app.model('userServices') }],
        })
        .then((row) => row?.dataValues as any);

      const localServiceInfo = user.user_services.find((s: any) => s.provider === 'local');
      expect(localServiceInfo).toBeDefined();

      const data: Record<string, any> = localServiceInfo.data;

      const currentPasswordHash = data.password;
      expect(currentPasswordHash).not.toEqual(password);

      const isPasswordValid = bcrypt.compareSync('NewP4ssw0!rd', currentPasswordHash);
      expect(isPasswordValid).toBe(true);

      const oldHash = data.oldPasswords[0];
      expect(bcrypt.compareSync(password, oldHash)).toBe(true);

      // Expect the requirement to change password to be removed
      expect(data.isChangeRequired).toBe(false);
    });

    it('should fail to change password with wrong credentials', async () => {
      await app
        .request()
        .post('/authorise/local/change_password')
        .send({ email, oldPassword: 'invalid', newPassword: 'NewP4ssw0!rd' })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({
            error: 'Invalid email or password.',
          });
        });
    });

    it('should fail to change password with weak password', async () => {
      await app
        .request()
        .post('/authorise/local/change_password')
        .send({ email, oldPassword: password, newPassword: 'weak' })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({
            error: 'Password must be at least 8 characters long.',
          });
        });
    });

    it('should try to login with empty credentials', async () => {
      await app
        .request()
        .post('/authorise/local')
        .send({ email: '', password: '' })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('should fail to login with a wrong account', async () => {
      await app
        .request()
        .post('/authorise/local')
        .send({ email: 'invalid', password })
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'Invalid email or password.',
          });
        });
    });

    it('should stop brute-force attacks', async () => {
      const attempts = config.passwordManager?.maxAttempts || 5;

      for (const i of Array.from({ length: attempts - 2 })) {
        await app
          .request()
          .post('/authorise/local')
          .send({ email, password: `${password}${i}` })
          .expect(401)
          .expect(({ body }) => {
            expect(body).toEqual({
              message: 'Invalid email or password.',
            });
          });
      }

      await app
        .request()
        .post('/authorise/local')
        .send({ email, password })
        .expect(429)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'Too many attempts. Please try again later.',
          });
        });
    });
  });
});
