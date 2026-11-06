(global as any).conf = {
  corezoidConfig: { apiLogin: 'x' },
  db: { database: 'x', username: 'x', password: 'x', host: 'localhost', dialect: 'postgres', port: 5432 },
};

jest.mock('../config/config', () => ({ corezoidConfig: { apiLogin: 'x' } }));
jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));

const { Message } = require('./message');

describe('Message.sendMessageByPhonesList blacklist log', () => {
  it('logs the blacklist size and masked phones, not the blacklist itself', async () => {
    (global as any).conf = { smsBlacklist: ['+7'] };
    const save = jest.fn();
    (global as any).log = { save };
    const controller: any = Object.create(Message.prototype);
    controller.issetPhonesList = jest.fn().mockReturnValue(true);
    const res = { send: jest.fn() };

    await controller.sendMessageByPhonesList({ body: { list_phone: ['+70000000000'] } }, res, jest.fn());

    const call = save.mock.calls.find((c) => c[0] === 'send-message-by-phone-blocked-by-blacklist');
    expect(call[1]).toEqual({ blockedPhones: ['***00'], allowedPhones: [], smsBlacklistSize: 1 });
    expect(call[1]).not.toHaveProperty('smsBlacklist');
  });
});
