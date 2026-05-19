const crypto = require('crypto');

jest.mock('../models/authorize', () => jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })));

const AuthorizeModel = require('../models/authorize');
const { checkAuth } = require('./auth');

const makeRes = () => ({ send: jest.fn() });
const makeNext = () => jest.fn();

const getFindOneMock = () => AuthorizeModel.mock.results[0].value.Authorize.findOne;

describe('checkAuth', () => {
  beforeEach(() => {
    global.conf = { authorization: {} };
    getFindOneMock().mockReset();
  });

  it('allows request when base64 token matches plain credentials from config list', async () => {
    global.conf.authorization.list = [{ user: 'notification', password: 'secret-pass' }];
    const token = Buffer.from('notification:secret-pass', 'utf8').toString('base64');
    const req = { headers: { authorization: `Basic ${token}` } };
    const res = makeRes();
    const next = makeNext();

    await checkAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
    expect(getFindOneMock()).not.toHaveBeenCalled();
  });

  it('returns auth error when decoded basic payload has no separator', async () => {
    const token = Buffer.from('notification-secret-pass', 'utf8').toString('base64');
    const req = { headers: { authorization: `Basic ${token}` } };
    const res = makeRes();
    const next = makeNext();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, {
      code: 'Authorization error',
      message: 'Authorization token not valid',
    });
  });

  it('returns auth error when password is empty', async () => {
    const token = Buffer.from('notification:', 'utf8').toString('base64');
    const req = { headers: { authorization: `Basic ${token}` } };
    const res = makeRes();
    const next = makeNext();

    await checkAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, {
      code: 'Authorization error',
      message: 'Password not match',
    });
  });

  it('uses hashed login for DB lookup when config list is absent', async () => {
    const login = 'notification';
    const pass = 'secret-pass';
    const token = Buffer.from(`${login}:${pass}`, 'utf8').toString('base64');
    const req = { headers: { authorization: `Basic ${token}` } };
    const res = makeRes();
    const next = makeNext();
    const hashedLogin = crypto.createHmac('sha512', login).update(pass).digest('hex').toUpperCase();

    getFindOneMock().mockResolvedValue({ authorize_id: 1 });

    await checkAuth(req, res, next);

    expect(getFindOneMock()).toHaveBeenCalledWith({ where: { login: hashedLogin, password: pass } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });
});