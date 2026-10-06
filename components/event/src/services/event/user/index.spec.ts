import { IdApiError } from '@liquio/back-core';

import { EventUser } from './index';

jest.mock('../../../models/unit_rules', () => ({
  UnitRulesModel: jest.fn().mockImplementation(() => ({})),
}));

const BASE_URL = 'http://id.local:8100';
const SEARCH_LIMIT = 25;

function createFakeClient() {
  return {
    updateUserById: jest.fn(),
    getUsersByIdsRaw: jest.fn(),
    getUsersByCodesRaw: jest.fn(),
    getUsersByEdrpouRaw: jest.fn(),
    searchUsersRaw: jest.fn(),
    // The same mapping as the real client, with a fixed base URL.
    getBriefUserInfo: jest.fn((user: any) => ({
      userId: user.userId,
      name: `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim(),
      companyName: user.companyName,
      isLegal: user.isLegal,
      isIndividualEntrepreneur: user.isIndividualEntrepreneur,
      email: user.email,
      phone: user.phone,
      ipn: user.ipn,
      edrpou: user.edrpou,
      avaUrl: user.avaUrl ? `${BASE_URL}${user.avaUrl}` : '',
    })),
  };
}

jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  getIdApiClient: jest.fn(),
}));

const backCore = jest.requireMock('@liquio/back-core');

describe('EventUser', () => {
  let client: ReturnType<typeof createFakeClient>;
  let eventUser: EventUser;
  let log: { save: jest.Mock };

  beforeEach(() => {
    client = createFakeClient();
    backCore.getIdApiClient.mockReturnValue(client);
    log = { save: jest.fn() };
    (global as any).log = log;
    (EventUser as any).singleton = undefined;
    eventUser = new EventUser({ searchUsersLimit: SEARCH_LIMIT });
  });

  afterEach(() => {
    (EventUser as any).singleton = undefined;
    delete (global as any).log;
  });

  describe('constructor', () => {
    it('should take the shared id-api client', () => {
      expect(backCore.getIdApiClient).toHaveBeenCalledWith();
      expect(eventUser.idApiClient).toBe(client);
    });

    it('should keep the search limit from the config', () => {
      expect(eventUser.searchUsersLimit).toBe(SEARCH_LIMIT);
    });

    it('should default the search limit to 10', () => {
      (EventUser as any).singleton = undefined;

      expect(new EventUser({}).searchUsersLimit).toBe(10);
    });
  });

  describe('updateUser', () => {
    it('should call updateUserById with the user ID and data', async () => {
      client.updateUserById.mockResolvedValue('ok');

      const result = await eventUser.updateUser('u1', { gender: 'M' }, 'wf-1', 'tpl-1');

      expect(client.updateUserById).toHaveBeenCalledWith('u1', { gender: 'M' });
      expect(result).toBe('ok');
    });

    it('should log the update with the workflow context', async () => {
      client.updateUserById.mockResolvedValue('ok');

      await eventUser.updateUser('u1', { gender: 'M' }, 'wf-1', 'tpl-1');

      expect(log.save).toHaveBeenCalledWith('user-updated', { userId: 'u1', response: 'ok', workflowId: 'wf-1', eventTemplate: 'tpl-1' });
    });

    it('should log and rethrow the error of id-api', async () => {
      const error = new IdApiError('{"error":"bad"}', { status: 400, body: { error: 'bad' }, code: 'HTTP_ERROR' });
      client.updateUserById.mockRejectedValue(error);

      await expect(eventUser.updateUser('u1', { gender: 'M' }, 'wf-1', 'tpl-1')).rejects.toBe(error);
      expect(log.save).toHaveBeenCalledWith('event-user-update-user-error', { error: '{"error":"bad"}', userId: 'u1', userData: { gender: 'M' } });
    });

    it('should rethrow the error when id-api does not answer ok', async () => {
      client.updateUserById.mockRejectedValue(new Error('User info was not updated by auth server.'));

      await expect(eventUser.updateUser('u1', {}, 'wf-1', 'tpl-1')).rejects.toThrow('User info was not updated by auth server.');
    });
  });

  describe('searchUser', () => {
    const unitModel = { getAll: jest.fn() };

    beforeEach(() => {
      unitModel.getAll.mockReset();
    });

    it('should get the users by IDs and map them to the brief info', async () => {
      client.getUsersByIdsRaw.mockResolvedValue([{ userId: 'u1', last_name: 'Ivanov', first_name: 'Ivan', avaUrl: '/ava/1.png' }]);

      const result = await eventUser.searchUser({ userIds: ['u1'] }, unitModel);

      expect(client.getUsersByIdsRaw).toHaveBeenCalledWith(['u1']);
      expect(result).toEqual([expect.objectContaining({ userId: 'u1', name: 'Ivanov Ivan', avaUrl: `${BASE_URL}/ava/1.png` })]);
    });

    it('should add the heads and members of the units to the IDs', async () => {
      unitModel.getAll.mockResolvedValue([{ id: 7, heads: ['h1'], members: ['m1'], basedOn: [] }]);
      client.getUsersByIdsRaw.mockResolvedValue([]);

      await eventUser.searchUser({ userIds: ['u1'], unitIds: [7] }, unitModel);

      expect(client.getUsersByIdsRaw).toHaveBeenCalledWith(['u1', 'h1', 'm1']);
    });

    it('should not ask id-api for IDs when there are none', async () => {
      const result = await eventUser.searchUser({}, unitModel);

      expect(client.getUsersByIdsRaw).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should swallow an id-api error with the "[]" message for IDs', async () => {
      client.getUsersByIdsRaw.mockRejectedValue(new IdApiError('[]', { status: 404, body: [], code: 'HTTP_ERROR' }));

      const result = await eventUser.searchUser({ userIds: ['u1'] }, unitModel);

      expect(result).toEqual([]);
    });

    it('should rethrow other id-api errors for IDs', async () => {
      client.getUsersByIdsRaw.mockRejectedValue(new IdApiError('boom', { status: 500, body: 'boom', code: 'HTTP_ERROR' }));

      await expect(eventUser.searchUser({ userIds: ['u1'] }, unitModel)).rejects.toThrow('boom');
    });

    it('should get the users by each code, with code as the ipn', async () => {
      client.getUsersByCodesRaw.mockResolvedValueOnce([{ userId: 'u1', ipn: '111' }]).mockResolvedValueOnce([{ userId: 'u2', ipn: '222' }]);

      const result = await eventUser.searchUser({ codes: ['111'], code: '222' }, unitModel);

      expect(client.getUsersByCodesRaw).toHaveBeenNthCalledWith(1, '111');
      expect(client.getUsersByCodesRaw).toHaveBeenNthCalledWith(2, '222');
      expect(result.map((user: any) => user.userId)).toEqual(['u1', 'u2']);
    });

    it('should swallow an id-api error with the "[]" message for codes and keep going', async () => {
      client.getUsersByCodesRaw
        .mockRejectedValueOnce(new IdApiError('[]', { status: 404, body: [], code: 'HTTP_ERROR' }))
        .mockResolvedValueOnce([{ userId: 'u2' }]);

      const result = await eventUser.searchUser({ codes: ['111', '222'] }, unitModel);

      expect(result.map((user: any) => user.userId)).toEqual(['u2']);
    });

    it('should rethrow other id-api errors for codes', async () => {
      client.getUsersByCodesRaw.mockRejectedValue(new IdApiError('boom', { status: 500, body: 'boom', code: 'HTTP_ERROR' }));

      await expect(eventUser.searchUser({ codes: ['111'] }, unitModel)).rejects.toThrow('boom');
    });

    it('should get the users by EDRPOU and wrap a single value in an array', async () => {
      client.getUsersByEdrpouRaw.mockResolvedValue([{ userId: 'u3', edrpou: '12345678' }]);

      const result = await eventUser.searchUser({ edrpou: '12345678' }, unitModel);

      expect(client.getUsersByEdrpouRaw).toHaveBeenCalledWith(['12345678']);
      expect(result).toEqual([expect.objectContaining({ userId: 'u3', edrpou: '12345678' })]);
    });

    it('should pass an array of EDRPOU as is', async () => {
      client.getUsersByEdrpouRaw.mockResolvedValue([]);

      await eventUser.searchUser({ edrpou: ['1', '2'] }, unitModel);

      expect(client.getUsersByEdrpouRaw).toHaveBeenCalledWith(['1', '2']);
    });

    it('should rethrow an id-api error for EDRPOU', async () => {
      client.getUsersByEdrpouRaw.mockRejectedValue(new IdApiError('boom', { status: 500, body: 'boom', code: 'HTTP_ERROR' }));

      await expect(eventUser.searchUser({ edrpou: '1' }, unitModel)).rejects.toThrow('boom');
    });

    it('should search by the string with the configured limit', async () => {
      client.searchUsersRaw.mockResolvedValue([{ userId: 'u4', last_name: 'Petrenko' }]);

      const result = await eventUser.searchUser({ search: 'Petr' }, unitModel);

      expect(client.searchUsersRaw).toHaveBeenCalledWith('Petr', SEARCH_LIMIT);
      expect(result).toEqual([expect.objectContaining({ userId: 'u4', name: 'Petrenko' })]);
    });

    it('should not swallow an id-api error of the search', async () => {
      client.searchUsersRaw.mockRejectedValue(new IdApiError('[]', { status: 404, body: [], code: 'HTTP_ERROR' }));

      await expect(eventUser.searchUser({ search: 'Petr' }, unitModel)).rejects.toThrow('[]');
    });

    it('should drop the duplicates by user ID', async () => {
      client.getUsersByIdsRaw.mockResolvedValue([{ userId: 'u1' }]);
      client.searchUsersRaw.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

      const result = await eventUser.searchUser({ userIds: ['u1'], search: 'x' }, unitModel);

      expect(result.map((user: any) => user.userId)).toEqual(['u1', 'u2']);
    });
  });

  describe('removeMembersFromUnitsByIpn', () => {
    const unitModel = { findById: jest.fn(), removeMemberList: jest.fn() };
    const accessHistoryModel = { save: jest.fn() };
    const taskModel = { removePerformerUserListFromTasks: jest.fn() };

    function params(ipnList: string[]) {
      return { unitIdList: [1], ipnList, unitModel, accessHistoryModel, taskModel, workflowId: 'wf', eventTemplate: 'tpl' };
    }

    beforeEach(() => {
      unitModel.findById.mockResolvedValue({ members: ['u1', 'u2'] });
      unitModel.removeMemberList.mockResolvedValue({ members: ['u2'] });
    });

    it('should look the user up by the IPN and remove the member', async () => {
      client.getUsersByCodesRaw.mockResolvedValue([{ userId: 'u1' }]);

      const results = await eventUser.removeMembersFromUnitsByIpn(params(['111']));

      expect(client.getUsersByCodesRaw).toHaveBeenCalledWith('111');
      expect(unitModel.removeMemberList).toHaveBeenCalledWith(1, ['u1']);
      expect(results[0].result).toContain('u1');
    });

    it('should report more than one user found by the IPN', async () => {
      client.getUsersByCodesRaw.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

      const results = await eventUser.removeMembersFromUnitsByIpn(params(['111']));

      expect(results[0].error).toBe('Found more than one user by ipn.');
    });

    it('should log the id-api error and report that the users are not found', async () => {
      client.getUsersByCodesRaw.mockRejectedValue(new IdApiError('boom', { status: 500, body: 'boom', code: 'HTTP_ERROR' }));

      const results = await eventUser.removeMembersFromUnitsByIpn(params(['111']));

      expect(log.save).toHaveBeenCalledWith('event-user-search-user-get-user-by-ipn-error', { error: 'IdApiError: boom' });
      expect(results[0].error).toBe('Users by ipns (111) not found.');
    });
  });
});
