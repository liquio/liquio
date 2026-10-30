import { UnitController } from './unit';

jest.mock('../models/unit', () => ({ UnitModel: jest.fn() }));
jest.mock('../models/unit_rules', () => ({ UnitRulesModel: jest.fn() }));
jest.mock('../services/custom_logs', () => ({ CustomLogs: jest.fn() }));

describe('UnitController', () => {
  const MEMBER_ID = '61efddaa351d6219eee09043';
  const HEAD_ID = '61efddaa351d6219eee09044';
  let client: Record<string, jest.Mock>;
  let controller: UnitController;
  let responseData: jest.SpyInstance;
  let responseError: jest.SpyInstance;

  beforeEach(() => {
    // Bypass the singleton constructor: it needs the models and the id-api client.
    controller = Object.create(UnitController.prototype);
    client = { getUsersByIds: jest.fn() };
    controller.idApiClient = client as any;
    (controller as any).unitModel = { findById: jest.fn().mockResolvedValue({ id: 1, members: [MEMBER_ID], heads: [HEAD_ID] }) };
    (global as any).config = {};
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    responseError = jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
  });

  describe('findByIdAsHead', () => {
    beforeEach(() => {
      jest.spyOn(controller, 'isRequestUserUnitHead').mockReturnValue(true);
    });

    it('should look the members and heads up with private props and the strict ids check', async () => {
      client.getUsersByIds.mockResolvedValue([
        { userId: MEMBER_ID, firstName: 'Ivan', ipn: '1' },
        { userId: HEAD_ID, firstName: 'Petro', ipn: '2' },
      ]);

      await controller.findByIdAsHead({ params: { id: '1' } }, {});

      expect(client.getUsersByIds).toHaveBeenCalledWith([MEMBER_ID, HEAD_ID], { withPrivateProps: true });
      expect(responseData.mock.calls[0][1]).toMatchObject({
        membersUsers: [{ userId: MEMBER_ID, firstName: 'Ivan' }],
        headsUsers: [{ userId: HEAD_ID, firstName: 'Petro' }],
      });
    });

    it('should respond with the users definition error when id-api fails', async () => {
      client.getUsersByIds.mockRejectedValue(new Error('Boom'));

      await controller.findByIdAsHead({ params: { id: '1' } }, {});

      expect(responseError).toHaveBeenCalledWith({}, 'Users definition error.', 500);
    });
  });

  describe('getUnitParticipantsAsHead', () => {
    it('should look the participants up with private props and the strict ids check', async () => {
      client.getUsersByIds.mockResolvedValue([{ userId: HEAD_ID, firstName: 'Petro', ipn: '2' }]);

      await controller.getUnitParticipantsAsHead({ body: { unitId: 1, userId: HEAD_ID } }, {});

      expect(client.getUsersByIds).toHaveBeenCalledWith([MEMBER_ID, HEAD_ID], { withPrivateProps: true });
      expect(responseData).toHaveBeenCalledWith({}, [expect.objectContaining({ userId: HEAD_ID, ipn: '2', isHead: true, isMember: false })]);
    });

    it('should respond with the users definition error when id-api fails', async () => {
      client.getUsersByIds.mockRejectedValue(new Error('Boom'));

      await controller.getUnitParticipantsAsHead({ body: { unitId: 1, userId: HEAD_ID } }, {});

      expect(responseError).toHaveBeenCalledWith({}, 'Users definition error.', 500);
    });
  });
});
