import { matchedData } from 'express-validator';
import { IdApiError, getIdApiClient } from '@liquio/back-core';

import { MassMessagesMailingController } from './mass_messages_mailing';

jest.mock('express-validator', () => ({ matchedData: jest.fn() }));
jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));
jest.mock('../businesses/mass_messages_mailing', () => ({ MassMessagesMailingBusiness: jest.fn() }));

const USER_ID = 'a'.repeat(24);

describe('MassMessagesMailingController.send', () => {
  let controller: MassMessagesMailingController;
  let idApiClient: Record<string, jest.Mock>;
  let business: Record<string, jest.Mock>;
  let res: { status: jest.Mock; send: jest.Mock; req: any };

  beforeEach(() => {
    (MassMessagesMailingController as any).singleton = undefined;
    (global as any).log = { save: jest.fn() };
    idApiClient = { getUsersByIds: jest.fn(), getUsers: jest.fn() };
    (getIdApiClient as jest.Mock).mockReturnValue(idApiClient);
    controller = new MassMessagesMailingController({ mass_messages_mailing: {} });
    business = { sendByEmailsAndUserIds: jest.fn().mockResolvedValue({ sent: 1 }) };
    (controller as any).massMessagesMailingBusiness = business;
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), req: { originalUrl: '/x', method: 'POST' } };
    (matchedData as jest.Mock).mockReturnValue({ emails_list: ['a@b.com'], user_ids_list: [USER_ID], subject: 's', full_text: 't' });
  });

  afterEach(() => {
    delete (global as any).log;
  });

  it('should send when all users and emails exist', async () => {
    idApiClient.getUsersByIds.mockResolvedValue([{ userId: USER_ID }]);
    idApiClient.getUsers.mockResolvedValue([{ email: 'a@b.com' }]);

    await controller.send({ authUserId: 'init' }, res);

    expect(idApiClient.getUsers).toHaveBeenCalledWith({ email: 'a@b.com', limit: 1, offset: 0 });
    expect(business.sendByEmailsAndUserIds).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should respond 500 when an email is not found', async () => {
    idApiClient.getUsersByIds.mockResolvedValue([{ userId: USER_ID }]);
    idApiClient.getUsers.mockResolvedValue([]);

    await controller.send({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: { message: 'Passed not existing user emails: a@b.com' } }));
    expect(business.sendByEmailsAndUserIds).not.toHaveBeenCalled();
  });

  it('should respond 500 when an id is not found', async () => {
    idApiClient.getUsersByIds.mockResolvedValue([]);

    await controller.send({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: { message: `Passed not existing userIds: ${USER_ID}` } }));
  });

  it('should respond 500 instead of throwing when id-api fails', async () => {
    idApiClient.getUsersByIds.mockRejectedValue(new IdApiError('boom', { status: 502, code: 'HTTP_ERROR' }));

    await expect(controller.send({}, res)).resolves.toBeUndefined();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: { message: 'boom' } }));
  });
});
