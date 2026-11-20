// Models build a (lazy, never connected) Sequelize instance at import time.
import { setAppContext } from '../lib/context';

setAppContext({
  conf: {
    corezoidConfig: { apiLogin: 'x' },
    db: { database: 'x', username: 'x', password: 'x', host: 'localhost', dialect: 'postgres', port: 5432 },
  },
});

jest.mock('../config/config', () => ({ corezoidConfig: { apiLogin: 'x' } }));
jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));

const { Message } = require('./message');

describe('Message.getMessages user resolution (NT-02b)', () => {
  const makeController = (checkToken: jest.Mock) => {
    const controller: any = Object.create(Message.prototype);
    controller.checkToken = checkToken;
    controller.getUserMessages = jest.fn().mockResolvedValue([]);
    controller.getUserMessagesCount = jest.fn().mockResolvedValue(0);
    controller.getAllUserMessages = jest.fn().mockResolvedValue([]);
    controller.getAllUserMessagesCount = jest.fn().mockResolvedValue(0);
    controller.countUnreadMessages = jest.fn().mockResolvedValue(0);
    controller.countReadMessages = jest.fn().mockResolvedValue(0);
    return controller;
  };
  const makeRes = () => ({ send: jest.fn(), setHeader: jest.fn() });

  beforeEach(() => {
    setAppContext({ log: { save: jest.fn() } });
  });

  it('lists the token owner messages when both access_token and a different user_id are sent', async () => {
    const controller = makeController(jest.fn().mockResolvedValue({ _id: 'owner' }));

    await controller.getMessages({ query: { access_token: 'tok', user_id: 'victim' } }, makeRes(), jest.fn());

    expect(controller.getUserMessages).toHaveBeenCalledTimes(1);
    const params = controller.getUserMessages.mock.calls[0][0];
    expect(params.user_id).toBe('owner');
    expect(params.access_token).toBeUndefined();
  });

  it('uses the token owner for showAll counters too', async () => {
    const controller = makeController(jest.fn().mockResolvedValue({ _id: 'owner' }));

    await controller.getMessages({ query: { access_token: 'tok', user_id: 'victim', showAll: 'true' } }, makeRes(), jest.fn());

    expect(controller.getAllUserMessages.mock.calls[0][0].user_id).toBe('owner');
    expect(controller.countUnreadMessages.mock.calls[0][0].user_id).toBe('owner');
  });

  it('answers 401 and does not fall back to user_id when the token is invalid', async () => {
    const controller = makeController(jest.fn().mockResolvedValue({ error: 'bad' }));
    const res = makeRes();

    await controller.getMessages({ query: { access_token: 'bad', user_id: 'victim' } }, res, jest.fn());

    expect(res.send).toHaveBeenCalledWith(401, expect.anything());
    expect(controller.getUserMessages).not.toHaveBeenCalled();
  });

  it('keeps a Basic caller that sends only user_id working', async () => {
    const checkToken = jest.fn();
    const controller = makeController(checkToken);

    await controller.getMessages({ query: { user_id: '42' } }, makeRes(), jest.fn());

    expect(checkToken).not.toHaveBeenCalled();
    expect(controller.getUserMessages.mock.calls[0][0].user_id).toBe('42');
  });
});
