import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TOTP } from '../src/lib/totp';
import { TestApp, config } from './test_app';

describe('AuthController - two-factor authentication on local login', () => {
  const password = 'V4l!dPassW0rd';
  const REGISTERED_URI = 'http://test-client-site';
  const PHONE_CODE = '123456';
  const PHONE = '+380501112233';
  const OTHER_PHONE = '+380501112244';
  let app: TestApp;
  let totpSecret: string;

  const users: Record<'plain' | 'phone' | 'otherPhone' | 'totp' | 'totpLock' | 'noType', { email: string; userId: string }> = {
    plain: { email: 'plain-2fa@email', userId: '' },
    phone: { email: 'phone-2fa@email', userId: '' },
    otherPhone: { email: 'other-phone-2fa@email', userId: '' },
    totp: { email: 'totp-2fa@email', userId: '' },
    totpLock: { email: 'totp-lock-2fa@email', userId: '' },
    noType: { email: 'notype-2fa@email', userId: '' },
  };

  async function createUser(key: keyof typeof users, ipn: string, extra: Record<string, any> = {}) {
    const { email } = users[key];
    const user = await app
      .model('user')
      .create({ ipn, provider: 'local', email, ...extra }, { returning: true })
      .then((row) => row.dataValues);
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId: user.userId,
      data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
    });
    users[key].userId = user.userId;
  }

  const login = async (agent: supertest.Agent, key: keyof typeof users) => {
    await agent.post('/authorise/local').send({ email: users[key].email, password }).expect(200);
  };

  const newAgent = () => supertest.agent(`http://localhost:${config.port}`);

  // Logs in and starts the authorization code flow, so `/authorise/continue` is ready to issue a code.
  async function startFlow(key: keyof typeof users): Promise<supertest.Agent> {
    const agent = newAgent();
    await login(agent, key);
    await agent
      .get('/authorise')
      .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
      .redirects(0)
      .expect(302);
    return agent;
  }

  const goOn = (agent: supertest.Agent) => agent.get('/authorise/continue').redirects(0);

  const expectNoCode = (response: supertest.Response, location?: string) => {
    expect(response.status).toBe(302);
    expect(response.headers.location).not.toContain(REGISTERED_URI);
    expect(response.headers.location).not.toContain('code=');
    if (location) expect(response.headers.location).toBe(location);
  };

  const expectCode = (response: supertest.Response) => {
    expect(response.status).toBe(302);
    const url = new URL(response.headers.location);
    expect(url.origin).toBe(REGISTERED_URI);
    expect(url.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
  };

  // Triggers the code sending (done by the guard) and confirms the phone factor with the known test code.
  async function completePhone(agent: supertest.Agent) {
    await goOn(agent);
    return agent.post('/sign_up/confirmation/phone/check').send({ code: PHONE_CODE });
  }

  const completeTotp = (agent: supertest.Agent) => agent.post('/authorise/totp').send({ code: new TOTP(totpSecret).generate() });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testConfirmations = {
      codes: [{ phones: [PHONE, OTHER_PHONE], confirmationCode: PHONE_CODE }],
    };

    app = await TestApp.setup();

    await createUser('plain', '#2000000001');
    await createUser('phone', '#2000000002', { phone: PHONE, useTwoFactorAuth: true, twoFactorType: 'phone' });
    await createUser('otherPhone', '#2000000003', { phone: OTHER_PHONE, useTwoFactorAuth: true, twoFactorType: 'phone' });
    await createUser('totp', '#2000000004', { useTwoFactorAuth: true, twoFactorType: 'totp' });
    await createUser('totpLock', '#2000000006', { useTwoFactorAuth: true, twoFactorType: 'totp' });
    await createUser('noType', '#2000000005', { useTwoFactorAuth: true });

    totpSecret = TOTP.createSecret();
    await app.model('userTotpSecret').create({ userId: users.totp.userId, secret: totpSecret });
    await app.model('userTotpSecret').create({ userId: users.totpLock.userId, secret: totpSecret });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  describe('account without 2FA', () => {
    it('should keep the normal flow and issue a code', async () => {
      const agent = await startFlow('plain');

      expectCode(await goOn(agent));
    });

    it('should keep the normal flow when 2FA is enabled but no factor is selected yet', async () => {
      const agent = await startFlow('noType');

      expectCode(await goOn(agent));
    });
  });

  describe('phone 2FA', () => {
    it('should not issue a code after the password alone and ask for the phone code', async () => {
      const agent = await startFlow('phone');

      expectNoCode(await goOn(agent), '/');
      // Repeating the request does not help either.
      expectNoCode(await goOn(agent), '/');
    });

    it('should not complete the factor with a wrong code', async () => {
      const agent = await startFlow('phone');
      await goOn(agent);

      await agent.post('/sign_up/confirmation/phone/check').send({ code: '000000' }).expect(200, { success: false, error: 'code not valid' });

      expectNoCode(await goOn(agent), '/');
    });

    it('should issue a code after the phone code was confirmed', async () => {
      const agent = await startFlow('phone');

      await completePhone(agent).then((response) => expect(response.body).toEqual({ success: true }));

      expectCode(await goOn(agent));
    });

    it('should not accept the confirmation for an unauthenticated session', async () => {
      await newAgent().post('/sign_up/confirmation/phone/check').send({ code: PHONE_CODE }).expect(401);
    });
  });

  describe('TOTP 2FA', () => {
    it('should not issue a code after the password alone and redirect to /totp', async () => {
      const agent = await startFlow('totp');

      expectNoCode(await goOn(agent), '/totp');
    });

    it('should not complete the factor with a wrong code', async () => {
      const agent = await startFlow('totp');

      await agent.post('/authorise/totp').send({ code: '000000' }).expect(401);

      expectNoCode(await goOn(agent), '/totp');
    });

    it('should issue a code after the TOTP code was verified', async () => {
      const agent = await startFlow('totp');

      await completeTotp(agent).expect(200, { success: true, redirect: '/authorise/continue' });

      expectCode(await goOn(agent));
    });

    it('should not verify a TOTP code without a session', async () => {
      await newAgent()
        .post('/authorise/totp')
        .send({ code: new TOTP(totpSecret).generate() })
        .expect(401);
    });

    it('should not let a TOTP code complete an account that has no TOTP configured', async () => {
      const agent = await startFlow('phone');

      await completeTotp(agent).expect(401);

      expectNoCode(await goOn(agent), '/');
    });
  });

  describe('TOTP brute-force protection', () => {
    it('should lock the user after the limit of failed attempts, even for a valid code and a new session', async () => {
      const agent = await startFlow('totpLock');
      for (let i = 0; i < 5; i++) {
        await agent.post('/authorise/totp').send({ code: '000000' }).expect(401);
      }

      await agent.post('/authorise/totp').send({ code: '000000' }).expect(429);
      await completeTotp(agent).expect(429);
      expectNoCode(await goOn(agent), '/totp');

      const otherSession = await startFlow('totpLock');
      await completeTotp(otherSession).expect(429);
      expectNoCode(await goOn(otherSession), '/totp');
    });

    it('should not let concurrent guesses exceed the limit', async () => {
      const agent = await startFlow('totp');

      const responses = await Promise.all(Array.from({ length: 12 }, () => agent.post('/authorise/totp').send({ code: '000000' })));

      expect(responses.filter((r) => r.status === 401)).toHaveLength(5);
      expect(responses.filter((r) => r.status === 429)).toHaveLength(7);
    });
  });

  describe('completion marker', () => {
    it('should be cleared by a fresh login of the same user', async () => {
      const agent = await startFlow('phone');
      await completePhone(agent);
      expectCode(await goOn(agent));

      await login(agent, 'phone');
      await agent
        .get('/authorise')
        .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
        .redirects(0)
        .expect(302);

      expectNoCode(await goOn(agent), '/');
    });

    it('should be cleared by a login as another user in the same session', async () => {
      const agent = await startFlow('phone');
      await completePhone(agent);

      await login(agent, 'otherPhone');
      await agent
        .get('/authorise')
        .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
        .redirects(0)
        .expect(302);

      expectNoCode(await goOn(agent), '/');
    });

    it('should not be satisfied by a marker of another user', async () => {
      const agent = await startFlow('otherPhone');
      await goOn(agent);
      await injectMarker(users.otherPhone.userId, { userId: users.phone.userId, factor: 'phone' });

      expectNoCode(await goOn(agent), '/');
    });

    it('should not be satisfied by a marker of another factor', async () => {
      const agent = await startFlow('phone');
      await goOn(agent);
      await injectMarker(users.phone.userId, { userId: users.phone.userId, factor: 'totp' });

      expectNoCode(await goOn(agent), '/');
    });

    it('should not be satisfied by a malformed marker', async () => {
      const agent = await startFlow('phone');
      await goOn(agent);
      await injectMarker(users.phone.userId, true);

      expectNoCode(await goOn(agent), '/');
    });

    it('should be satisfied by a valid marker of the same user and factor', async () => {
      const agent = await startFlow('phone');
      await injectMarker(users.phone.userId, { userId: users.phone.userId, factor: 'phone' });

      expectCode(await goOn(agent));
    });

    it('should not be satisfied by the legacy phoneChecked/totpChecked flags in the session user', async () => {
      const agent = await startFlow('phone');
      await patchSession(users.phone.userId, (data) => {
        data.passport.user.phoneChecked = true;
        data.passport.user.totpChecked = true;
      });

      expectNoCode(await goOn(agent), '/');
    });

    it('should stop satisfying the guard when the account switches to another factor', async () => {
      const agent = await startFlow('phone');
      await completePhone(agent);
      expectCode(await goOn(agent));
      await agent
        .get('/authorise')
        .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
        .redirects(0)
        .expect(302);

      await app.model('user').update({ twoFactorType: 'totp' }, { where: { userId: users.phone.userId } });
      try {
        expectNoCode(await goOn(agent), '/totp');
      } finally {
        await app.model('user').update({ twoFactorType: 'phone' }, { where: { userId: users.phone.userId } });
      }
    });
  });

  describe('2FA settings source', () => {
    it('should require 2FA enabled after login, even when it was off at login time', async () => {
      const agent = await startFlow('plain');
      await app.model('user').update({ useTwoFactorAuth: true, twoFactorType: 'totp' }, { where: { userId: users.plain.userId } });
      try {
        expectNoCode(await goOn(agent), '/totp');
      } finally {
        await app.model('user').update({ useTwoFactorAuth: false, twoFactorType: null as any }, { where: { userId: users.plain.userId } });
      }
    });
  });

  describe('fail closed', () => {
    it('should not issue a code for a user deleted after login', async () => {
      const email = 'deleted-2fa@email';
      const user = await app
        .model('user')
        .create({ ipn: '#2000000098', provider: 'local', email }, { returning: true })
        .then((row) => row.dataValues);
      await app.model('userServices').create({
        provider: 'local',
        provider_id: email,
        userId: user.userId,
        data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
      });

      const agent = newAgent();
      await agent.post('/authorise/local').send({ email, password }).expect(200);
      await agent
        .get('/authorise')
        .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
        .redirects(0)
        .expect(302);

      await app.model('loginHistory').destroy({ where: { user_id: user.userId } });
      await app.model('userServices').destroy({ where: { userId: user.userId } });
      await app.model('user').destroy({ where: { userId: user.userId } });

      const response = await goOn(agent);
      expect(response.headers.location ?? '').not.toContain(REGISTERED_URI);
      expect(response.headers.location ?? '').not.toContain('code=');
    });
  });

  // Rewrites the stored session data of a user, to simulate a stale or forged session state.
  async function patchSession(userId: string, patch: (data: any) => void) {
    const sessions = await app.model('sessions').findAll({ where: { userId } });
    expect(sessions.length).toBeGreaterThan(0);
    for (const row of sessions) {
      const data = JSON.parse(row.dataValues.data);
      patch(data);
      await app.model('sessions').update({ data: JSON.stringify(data) }, { where: { sid: row.dataValues.sid } });
    }
  }

  const injectMarker = (userId: string, marker: unknown) =>
    patchSession(userId, (data) => {
      data.twoFactorCompleted = marker;
    });
});
