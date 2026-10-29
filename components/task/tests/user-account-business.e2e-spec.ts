import { getIdApiClient, IdApiError } from '@liquio/back-core';

import { TestApp } from './test-app';
import { addUnit, userRequest } from './helpers/scenario';

const USER = 'account-user';

// User controller over HTTP with the ID API client replaced by spies:
// profile update, two factor auth, phone and email confirmation and search.
describe('User account', () => {
  let app: TestApp;
  const idApi = () => getIdApiClient() as any;
  const as = (extra: any = {}, userId = USER) => userRequest(app, userId, extra);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await addUnit(app, { id: 990041, name: 'Account unit', heads: ['account-head'], members: ['account-member'], heads_ipn: [], members_ipn: [] });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('search', () => {
    it('collects users by ids, units, codes and free text without duplicates', async () => {
      jest.spyOn(idApi(), 'getUsersByIds').mockResolvedValue([{ userId: 'u1', name: 'One', email: 'one@example.test' }]);
      jest
        .spyOn(idApi(), 'getUserByCode')
        .mockResolvedValueOnce({ userId: 'u2', name: 'Two' })
        .mockResolvedValueOnce({ userId: 'u2', name: 'Two' })
        .mockResolvedValue(null);
      jest.spyOn(idApi(), 'searchUsers').mockResolvedValue([
        { userId: 'u1', name: 'One' },
        { userId: 'u3', name: 'Three' },
      ]);
      const response = await as({ role: 'admin' })('post', '/users/search').send({
        userIds: ['u1'],
        unitIds: [990041],
        ids: [990041],
        codes: ['111'],
        code: '222',
        search: 'Thr',
      });
      expect(response.status).toBe(200);
      expect(response.body.data.map((v) => v.userId).sort()).toEqual(['u1', 'u2', 'u3']);
    });
  });

  describe('profile', () => {
    it('updates the profile and clears the cached token', async () => {
      const update = jest.spyOn(idApi(), 'updateUser').mockResolvedValue(true);
      const response = await as({ phone: '+380501234501', email: 'a@example.test' })('put', '/users').send({
        gender: 'male',
        phone: '+380501234501',
        email: 'a@example.test',
        address: 'x',
      });
      expect(response.status).toBe(202);
      expect(update).toHaveBeenCalled();
    });

    it('rejects an unknown gender, unconfirmed phone or email and a legal entrepreneur switch', async () => {
      expect((await as()('put', '/users').send({ gender: 'robot' })).status).toBeGreaterThanOrEqual(400);
      expect((await as({ phone: '+380501234501' })('put', '/users').send({ phone: '+380501234502' })).status).toBeGreaterThanOrEqual(400);
      expect((await as({ email: 'a@example.test' })('put', '/users').send({ email: 'b@example.test' })).status).toBeGreaterThanOrEqual(400);
      expect((await as({ isLegal: true })('put', '/users').send({ isIndividualEntrepreneur: true })).status).toBeGreaterThanOrEqual(400);
    });

    it('allows unconfirmed values by config and reports ID API failures', async () => {
      const config = (global as any).config;
      config.user = { ...config.user, allowSetUnconfirmedPhone: true, allowSetUnconfirmedEmail: true };
      const update = jest.spyOn(idApi(), 'updateUser').mockResolvedValueOnce(false);
      expect((await as()('put', '/users').send({ phone: '+380501234501', email: 'c@example.test' })).status).toBeGreaterThanOrEqual(400);
      update.mockRejectedValueOnce(new Error('id down'));
      expect((await as()('put', '/users').send({ phone: '+380501234501' })).status).toBeGreaterThanOrEqual(400);
      config.user = { ...config.user, allowSetUnconfirmedPhone: false, allowSetUnconfirmedEmail: false };
    });
  });

  describe('two factor auth', () => {
    it('reads and sets the state', async () => {
      const read = await as({ useTwoFactorAuth: true, twoFactorType: 'phone' })('get', '/users/two_factor_auth');
      expect(read.body.data).toEqual({ useTwoFactorAuth: true, twoFactorType: 'phone' });
      const set = jest.spyOn(idApi(), 'setTwoFactorAuth').mockResolvedValue({ success: true });
      expect((await as()('post', '/users/two_factor_auth').send({ useTwoFactorAuth: true, twoFactorType: 'phone', code: '1' })).status).toBe(202);
      expect(set).toHaveBeenCalled();
      expect((await as()('post', '/users/two_factor_auth').send({ useTwoFactorAuth: true, twoFactorType: 'email' })).status).toBeGreaterThanOrEqual(
        400,
      );
      set.mockResolvedValueOnce({ success: false, error: 'wrong code' });
      expect((await as()('post', '/users/two_factor_auth').send({ useTwoFactorAuth: true })).status).toBeGreaterThanOrEqual(400);
      set.mockRejectedValueOnce(new Error('id down'));
      expect((await as()('post', '/users/two_factor_auth').send({ useTwoFactorAuth: true })).status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('phone', () => {
    it('reports the phone verification status', async () => {
      expect((await as()('get', '/users/phone/exist')).status).toBeGreaterThanOrEqual(400);
      const ok = await as({ valid: { phone: true } })('get', '/users/phone/exist');
      expect(ok.body.data).toEqual({ exists: true });
    });

    it('checks if a phone is already used', async () => {
      const check = jest.spyOn(idApi(), 'checkPhoneExist').mockResolvedValue({ isExist: true, isConfirmed: false });
      const ok = await as()('get', '/users/phone/already_used').query({ phone: '+380501234501' });
      expect(ok.body.data).toEqual({ isExist: true, isConfirmed: false });
      check.mockRejectedValueOnce(new Error('id down'));
      expect((await as()('get', '/users/phone/already_used').query({ phone: '+380501234501' })).status).toBeGreaterThanOrEqual(400);
    });

    it('sends the sms for verification', async () => {
      const send = jest.spyOn(idApi(), 'sendSms').mockResolvedValue(undefined);
      expect((await as()('post', '/users/phone/send_sms_for_phone_verification').send({})).status).toBeGreaterThanOrEqual(400);
      expect((await as()('post', '/users/phone/send_sms_for_phone_verification').send({ phone: '+380501234501' })).status).toBe(202);
      send.mockRejectedValueOnce(new Error('sms down'));
      expect((await as()('post', '/users/phone/send_sms_for_phone_verification').send({ phone: '+380501234501' })).status).toBeGreaterThanOrEqual(
        400,
      );
    });

    it('verifies the phone and maps every ID API outcome', async () => {
      const verify = jest.spyOn(idApi(), 'verifyPhoneAndSet');
      const call = () => as()('post', '/users/phone/verify').send({ phone: '+380501234501', code: '123456' });
      expect((await as()('post', '/users/phone/verify').send({ code: '1' })).status).toBeGreaterThanOrEqual(400);
      verify.mockResolvedValueOnce({ data: { verified: true } });
      expect((await call()).body.data).toEqual({ verified: true });
      verify.mockRejectedValueOnce(new IdApiError('bad', { status: 400, body: { error: { message: 'Wrong code' } }, code: 'HTTP_ERROR' }));
      expect((await call()).body.error.message).toContain('Wrong code');
      verify.mockRejectedValueOnce(new Error('boom'));
      expect((await call()).status).toBeGreaterThanOrEqual(400);
      verify.mockResolvedValueOnce(undefined);
      expect((await call()).status).toBeGreaterThanOrEqual(400);
      verify.mockResolvedValueOnce({ error: { message: 'refused' } });
      expect((await call()).status).toBeGreaterThanOrEqual(400);
      verify.mockResolvedValueOnce({});
      expect((await call()).status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('email', () => {
    it('changes, confirms, checks the code and checks the existence', async () => {
      const change = jest.spyOn(idApi(), 'changeEmail').mockResolvedValue(undefined);
      const confirm = jest.spyOn(idApi(), 'confirmChangeEmail').mockResolvedValue(undefined);
      const code = jest.spyOn(idApi(), 'checkEmailConfirmationCode').mockResolvedValue(undefined);
      const exists = jest.spyOn(idApi(), 'checkEmail').mockResolvedValue(true);
      expect((await as()('put', '/users/email/change').send({ email: 'd@example.test' })).status).toBe(202);
      expect((await as()('post', '/users/email/confirm').send({ email: 'd@example.test', code: '1' })).status).toBe(202);
      expect((await as()('post', '/users/email/check_email_confirmation_code').send({ email: 'd@example.test', code: '1' })).status).toBe(202);
      expect((await as()('post', '/users/email/check').send({ email: 'd@example.test' })).body.data).toEqual({ isExist: true });
      change.mockRejectedValueOnce(new Error('x'));
      confirm.mockRejectedValueOnce(new Error('x'));
      code.mockRejectedValueOnce(new Error('x'));
      exists.mockRejectedValueOnce(new Error('x'));
      expect((await as()('put', '/users/email/change').send({ email: 'd@example.test' })).status).toBeGreaterThanOrEqual(400);
      expect((await as()('post', '/users/email/confirm').send({ email: 'd@example.test', code: '1' })).status).toBeGreaterThanOrEqual(400);
      expect(
        (await as()('post', '/users/email/check_email_confirmation_code').send({ email: 'd@example.test', code: '1' })).status,
      ).toBeGreaterThanOrEqual(400);
      expect((await as()('post', '/users/email/check').send({ email: 'd@example.test' })).status).toBeGreaterThanOrEqual(400);
    });
  });
});
