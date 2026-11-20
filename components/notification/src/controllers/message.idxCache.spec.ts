import { Model } from 'sequelize';

import { setAppContext } from '../lib/context';

setAppContext({
  conf: {
    corezoidConfig: { apiLogin: 'x' },
    db: { database: 'x', username: 'x', password: 'x', host: 'localhost', dialect: 'postgres', port: 5432 },
  },
});

const mockSendMessageToSender = jest.fn();

jest.mock('../config/config', () => ({ corezoidConfig: { apiLogin: 'x' } }));
jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));
jest.mock('../models/smsGate/corezoidModel', () => ({
  CorezoidGate: jest.fn().mockImplementation(() => ({ sendMessageToSender: (...args: any[]) => mockSendMessageToSender(...args) })),
}));

const { Message } = require('./message');

const mockCreate = jest.spyOn(Model, 'create');

describe('Message sender error callback cache', () => {
  beforeEach(() => {
    setAppContext({ conf: {}, log: { save: jest.fn() } });
    mockSendMessageToSender.mockReset();
    mockCreate.mockReset();
  });

  const createController = () => {
    const controller: any = Object.create(Message.prototype);
    controller.issetPhonesList = jest.fn().mockReturnValue(true);
    controller.sendByPhones = jest.fn().mockResolvedValue('sent');
    return controller;
  };

  it('resends stored phones and text for a known sender ref', async () => {
    const controller = createController();
    mockCreate.mockResolvedValue({ message_id: 1 });
    mockSendMessageToSender.mockResolvedValue({ ref: 'ref-1', response: { ok: true } });

    const sendRes = { send: jest.fn() };
    await controller.sendMessageByPhonesList(
      { body: { list_phone: ['+380000000001'], short_message: 'hello', short_message_translit: 'hello', private: true } },
      sendRes,
      jest.fn(),
    );
    expect(sendRes.send).toHaveBeenCalledWith({ ok: true });

    const res = { send: jest.fn() };
    await controller.senderErrorCallack({ query: { id: 'ref-1' } }, res, jest.fn());

    expect(controller.sendByPhones).toHaveBeenCalledWith(['+380000000001'], 'hello');
    expect(res.send).toHaveBeenCalledWith({ sendBySms: 'sent' });
  });

  it('does not resend or throw for an unknown key', async () => {
    const controller = createController();
    const res = { send: jest.fn() };

    await expect(controller.senderErrorCallack({ query: { id: 'not-existing-key' } }, res, jest.fn())).resolves.not.toThrow();

    expect(controller.sendByPhones).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});
