import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('User Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('POST /users/search', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/search');
    });
  });

  describe('GET /users/two_factor_auth', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/users/two_factor_auth');
    });
  });

  describe('POST /users/two_factor_auth', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/two_factor_auth');
    });
  });

  describe('PUT /users', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/users');
    });
  });

  describe('GET /users/phone/exist', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/users/phone/exist');
    });
  });

  describe('GET /users/phone/already_used', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/users/phone/already_used');
    });
  });

  describe('POST /users/phone/send_sms_for_phone_verification', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/phone/send_sms_for_phone_verification');
    });
  });

  describe('POST /users/phone/verify', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/phone/verify');
    });
  });

  describe('PUT /users/email/change', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/users/email/change');
    });
  });

  describe('POST /users/email/confirm', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/email/confirm');
    });
  });

  describe('POST /users/email/check_email_confirmation_code', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/email/check_email_confirmation_code');
    });
  });

  describe('POST /users/email/check', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/users/email/check');
    });
  });
});
