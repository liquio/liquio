import { IdApiError } from '@liquio/back-core';

import { OnboardingController } from './onboarding';
import { Helpers } from '../lib/helpers';

jest.mock('../lib/redis_client', () => ({ RedisClient: jest.fn() }));
jest.mock('../lib/helpers', () => ({ Helpers: { getUserUnits: jest.fn().mockReturnValue([]) } }));

describe('OnboardingController', () => {
  const USER_ID = '61efddaa351d6219eee09043';
  let client: Record<string, jest.Mock>;
  let controller: OnboardingController;

  beforeEach(() => {
    // Bypass the singleton constructor: it needs the id-api client.
    controller = Object.create(OnboardingController.prototype);
    client = { getUsersByIds: jest.fn(), updateUserOnboarding: jest.fn() };
    controller.idApiClient = client as any;
    (controller as any).config = {};
    (global as any).log = { save: jest.fn() };
    (Helpers.getUserUnits as jest.Mock).mockReturnValue([]);
  });

  describe('updateUserOnboarding', () => {
    it('should pass the params to the client', async () => {
      client.updateUserOnboarding.mockResolvedValue(undefined);

      await controller.updateUserOnboarding(USER_ID, { onboardingTaskId: 't1', needOnboarding: true });

      expect(client.updateUserOnboarding).toHaveBeenCalledWith(USER_ID, { onboardingTaskId: 't1', needOnboarding: true });
    });

    it('should only log an error response of id-api', async () => {
      client.updateUserOnboarding.mockRejectedValue(new IdApiError('Not found', { status: 404, body: 'Not found', code: 'HTTP_ERROR' }));

      await expect(controller.updateUserOnboarding(USER_ID, { onboardingTaskId: '' })).resolves.toBeUndefined();

      expect((global as any).log.save).toHaveBeenCalledWith(
        'update-user-onboarding-error',
        { userId: USER_ID, status: 404, error: 'Not found' },
        'error',
      );
    });

    it('should throw a network error', async () => {
      const error = new IdApiError('Network error', { code: 'NETWORK_ERROR' });
      client.updateUserOnboarding.mockRejectedValue(error);

      await expect(controller.updateUserOnboarding(USER_ID, { onboardingTaskId: '' })).rejects.toBe(error);
    });

    it('should throw an error that is not from id-api', async () => {
      const error = new Error('Unexpected');
      client.updateUserOnboarding.mockRejectedValue(error);

      await expect(controller.updateUserOnboarding(USER_ID, { onboardingTaskId: '' })).rejects.toBe(error);
    });
  });

  describe('markUserOnboardingDone', () => {
    it('should look the user up with the strict ids check and reset the onboarding', async () => {
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID }]);
      client.updateUserOnboarding.mockResolvedValue(undefined);

      await controller.markUserOnboardingDone(USER_ID, { taskTemplateId: 1 });

      expect(client.getUsersByIds).toHaveBeenCalledWith([USER_ID], { withPrivateProps: true });
      expect(client.updateUserOnboarding).toHaveBeenCalledWith(USER_ID, { onboardingTaskId: '', needOnboarding: false });
    });

    it('should not fail when id-api rejects the reset', async () => {
      client.getUsersByIds.mockResolvedValue([{ userId: USER_ID }]);
      client.updateUserOnboarding.mockRejectedValue(new IdApiError('Boom', { status: 500, code: 'HTTP_ERROR' }));

      await expect(controller.markUserOnboardingDone(USER_ID, { taskTemplateId: 1 })).resolves.toBeUndefined();
    });
  });
});
