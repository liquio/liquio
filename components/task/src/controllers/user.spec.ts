import { IdApiError } from '@liquio/back-core';

import { UserController } from './user';

jest.mock('../models/unit', () => ({ UnitModel: jest.fn() }));

describe('UserController', () => {
  const USER_ID = '61efddaa351d6219eee09043';
  let client: Record<string, jest.Mock>;
  let controller: UserController;
  let responseData: jest.SpyInstance;
  let responseError: jest.SpyInstance;
  let responseThatAccepted: jest.SpyInstance;

  const httpError = (body: any, status = 400) =>
    new IdApiError(typeof body === 'string' ? body : JSON.stringify(body), { status, body, code: 'HTTP_ERROR' });

  beforeEach(() => {
    // Bypass the singleton constructor: it needs the models and the id-api client.
    controller = Object.create(UserController.prototype);
    client = {
      getUsersByIds: jest.fn(),
      getUserByCode: jest.fn(),
      searchUsers: jest.fn(),
      updateUser: jest.fn(),
      checkPhoneExist: jest.fn(),
      sendSms: jest.fn(),
      verifyPhoneAndSet: jest.fn(),
      changeEmail: jest.fn(),
      confirmChangeEmail: jest.fn(),
      checkEmailConfirmationCode: jest.fn(),
      checkEmail: jest.fn(),
    };
    controller.idApiClient = client as any;
    (controller as any).config = { user: {} };
    (global as any).log = { save: jest.fn() };
    (global as any).redisClient = undefined;
    (global as any).config = { user: {} };
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    responseError = jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
    responseThatAccepted = jest.spyOn(controller, 'responseThatAccepted').mockImplementation(() => undefined as any);
  });

  describe('search', () => {
    it('should look the users up by ids with the strict ids check and no private props', async () => {
      (controller as any).unitModel = { getAll: jest.fn().mockResolvedValue([]) };
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID, name: 'Ivan', ipn: '1234567890' }]);

      await controller.search({ body: { userIds: [USER_ID] } }, {});

      expect(client.getUsersByIds).toHaveBeenCalledWith([USER_ID], { withPrivateProps: false });
      expect(responseData).toHaveBeenCalledWith({}, [expect.objectContaining({ userId: USER_ID, name: 'Ivan' })]);
      expect(responseData.mock.calls[0][1][0].ipn).toBeUndefined();
    });

    it('should add the users found by the code and by the search string', async () => {
      (controller as any).unitModel = { getAll: jest.fn().mockResolvedValue([]) };
      client.getUsersByIds.mockResolvedValue([]);
      client.getUserByCode.mockResolvedValue({ userId: 'u2', name: 'Petro' });
      client.searchUsers.mockResolvedValue([{ userId: 'u3', name: 'Olena', ipn: '1' }]);

      await controller.search({ body: { codes: ['1234567890'], search: 'Ol' } }, {});

      const data = responseData.mock.calls[0][1];
      expect(data.map((v) => v.userId)).toEqual(['u2', 'u3']);
      expect(data[1].name).toBe('Olena');
    });
  });

  describe('updateInfo', () => {
    const req = (body = {}) => ({ body, userInfo: undefined }) as any;

    beforeEach(() => {
      jest.spyOn(controller, 'getRequestUserId').mockReturnValue(USER_ID);
      jest.spyOn(controller, 'getRequestUserAccessToken').mockReturnValue('access-token');
      jest.spyOn(controller, 'getRequestUserInfo').mockReturnValue({ phone: '+380501112233', email: 'a@b.c' } as any);
    });

    it('should update the user and answer that it is accepted', async () => {
      client.updateUser.mockResolvedValue(true);

      await controller.updateInfo(req({ gender: 'male' }), {});

      expect(client.updateUser).toHaveBeenCalledWith(USER_ID, 'access-token', expect.objectContaining({ gender: 'male' }));
      expect(responseThatAccepted).toHaveBeenCalled();
    });

    it('should respond with the error of id-api when the update is rejected', async () => {
      const error = httpError('Wrong birthday.');
      client.updateUser.mockRejectedValue(error);

      await controller.updateInfo(req({ gender: 'male', phone: '+380501112233', email: 'a@b.c' }), {});

      expect(responseError).toHaveBeenCalledWith({}, error);
      expect(responseThatAccepted).not.toHaveBeenCalled();
    });

    it('should respond that the user info can not be updated when id-api does not confirm it', async () => {
      client.updateUser.mockResolvedValue(false);

      await controller.updateInfo(req({ gender: 'male' }), {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't update user info.");
    });
  });

  describe('setTwoFactorAuth', () => {
    beforeEach(() => {
      jest.spyOn(controller, 'getRequestUserId').mockReturnValue(USER_ID);
      jest.spyOn(controller, 'getRequestUserAccessToken').mockReturnValue('access-token');
    });

    it('should respond with the error of id-api when the update is rejected', async () => {
      const error = httpError('Forbidden.', 403);
      client.updateUser.mockRejectedValue(error);

      await controller.setTwoFactorAuth({ body: { useTwoFactorAuth: true, twoFactorType: 'phone' } }, {});

      expect(client.updateUser).toHaveBeenCalledWith(USER_ID, 'access-token', { useTwoFactorAuth: true, twoFactorType: 'phone' });
      expect(responseError).toHaveBeenCalledWith({}, error);
    });

    it('should respond that the two factor auth is not set when id-api does not confirm it', async () => {
      client.updateUser.mockResolvedValue(false);

      await controller.setTwoFactorAuth({ body: { useTwoFactorAuth: false } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't set two factor auth.");
    });
  });

  describe('findById', () => {
    it('should look the user up with the strict ids check', async () => {
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID, name: 'Ivan' }]);

      await controller.findById({ params: { id: USER_ID } }, {});

      expect(client.getUsersByIds).toHaveBeenCalledWith(USER_ID);
    });

    it('should not expose the IPN and EDRPOU of the user', async () => {
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID, name: 'Ivan', ipn: '1234567890', edrpou: '12345678', email: 'a@b.c' }]);

      await controller.findById({ params: { id: USER_ID } }, {});

      expect(responseData).toHaveBeenCalledWith({}, { user: { userId: USER_ID, name: 'Ivan', email: 'a@b.c' } });
    });

    it('should respond with the error when the lookup fails', async () => {
      const error = httpError('Boom', 500);
      client.getUsersByIds.mockRejectedValue(error);

      await controller.findById({ params: { id: USER_ID } }, {});

      expect(responseError).toHaveBeenCalledWith({}, error);
    });
  });

  describe('isPhoneAlreadyUsed', () => {
    it('should respond with the phone existing info', async () => {
      client.checkPhoneExist.mockResolvedValue({ isExist: true, isConfirmed: false });

      await controller.isPhoneAlreadyUsed({ query: { phone: '+380501112233' } }, {});

      expect(responseData).toHaveBeenCalledWith({}, { isExist: true, isConfirmed: false });
    });

    it('should respond with the error when id-api answers with an error status', async () => {
      client.checkPhoneExist.mockRejectedValue(httpError('Boom', 500));

      await controller.isPhoneAlreadyUsed({ query: { phone: '+380501112233' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't check phone existing info.");
    });
  });

  describe('verifyPhone', () => {
    const req = { body: { phone: '+380501112233', code: '1234' } };

    beforeEach(() => {
      jest.spyOn(controller, 'getRequestUserAccessToken').mockReturnValue('access-token');
      jest.spyOn(controller, 'getRequestUserInfo').mockReturnValue({} as any);
    });

    it('should respond with the data of id-api', async () => {
      client.verifyPhoneAndSet.mockResolvedValue({ data: { isConfirmed: true } });

      await controller.verifyPhone(req, {});

      expect(client.verifyPhoneAndSet).toHaveBeenCalledWith('+380501112233', '1234', 'access-token');
      expect(responseData).toHaveBeenCalledWith({}, { isConfirmed: true });
    });

    it('should respond with the message of the id-api error body', async () => {
      client.verifyPhoneAndSet.mockRejectedValue(httpError({ error: { message: 'Wrong code.', type: 'x' } }));

      await controller.verifyPhone(req, {});

      expect(responseError).toHaveBeenCalledWith({}, 'Wrong code.');
    });

    it('should respond with the message of an error body in a successful response', async () => {
      client.verifyPhoneAndSet.mockResolvedValue({ error: { message: 'Wrong code.' } });

      await controller.verifyPhone(req, {});

      expect(responseError).toHaveBeenCalledWith({}, 'Wrong code.');
    });

    it('should respond with the common message when the error has no id-api message', async () => {
      client.verifyPhoneAndSet.mockRejectedValue(new IdApiError('Network error', { code: 'NETWORK_ERROR' }));

      await controller.verifyPhone(req, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't verity phone.");
    });

    it('should not log the access token', async () => {
      client.verifyPhoneAndSet.mockRejectedValue(new IdApiError('Network error', { code: 'NETWORK_ERROR' }));

      await controller.verifyPhone(req, {});

      expect(JSON.stringify((global as any).log.save.mock.calls)).not.toContain('access-token');
    });
  });

  describe('sendSmsForPhoneVerification', () => {
    it('should respond with the common message when id-api fails', async () => {
      jest.spyOn(controller, 'getRequestUserInfo').mockReturnValue({} as any);
      client.sendSms.mockRejectedValue(httpError('Boom', 500));

      await controller.sendSmsForPhoneVerification({ body: { phone: '+380501112233' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't send sms.");
    });
  });

  describe('changeEmail', () => {
    it('should respond that the email code is sent', async () => {
      client.changeEmail.mockResolvedValue('ok');

      await controller.changeEmail({ body: { email: 'a@b.c' } }, {});

      expect(client.changeEmail).toHaveBeenCalledWith('a@b.c');
      expect(responseThatAccepted).toHaveBeenCalled();
    });

    it('should respond with the error when id-api answers with an error status', async () => {
      client.changeEmail.mockRejectedValue(httpError({ error: 'Invalid email' }));

      await controller.changeEmail({ body: { email: 'a@b.c' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't send email code.");
      expect(responseThatAccepted).not.toHaveBeenCalled();
    });
  });

  describe('confirmChangeEmail', () => {
    it('should respond with the error when the code is rejected', async () => {
      jest.spyOn(controller, 'getRequestUserAccessToken').mockReturnValue('access-token');
      client.confirmChangeEmail.mockRejectedValue(httpError('Wrong code.'));

      await controller.confirmChangeEmail({ body: { email: 'a@b.c', code: '1' } }, {});

      expect(client.confirmChangeEmail).toHaveBeenCalledWith('a@b.c', '1', 'access-token');
      expect(responseError).toHaveBeenCalledWith({}, "Can't confirm change email.");
    });
  });

  describe('checkEmailConfirmationCode', () => {
    it('should respond with the error when the code is not confirmed', async () => {
      jest.spyOn(controller, 'getRequestUserAccessToken').mockReturnValue('access-token');
      client.checkEmailConfirmationCode.mockRejectedValue(new Error('Email code not confirmed by auth server.'));

      await controller.checkEmailConfirmationCode({ body: { email: 'a@b.c', code: '1' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't check email confirmaiton code.");
    });
  });

  describe('checkEmail', () => {
    it('should respond with the existence flag', async () => {
      client.checkEmail.mockResolvedValue(true);

      await controller.checkEmail({ body: { email: 'a@b.c' } }, {});

      expect(responseData).toHaveBeenCalledWith({}, { isExist: true });
    });

    it('should respond with the error when id-api answers with an error status', async () => {
      client.checkEmail.mockRejectedValue(httpError('Boom', 500));

      await controller.checkEmail({ body: { email: 'a@b.c' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, "Can't define email existence status.");
    });
  });
});
