import crypto from 'node:crypto';

jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));

import { AuthorizeModel } from '../models/authorize';
import { checkAuth } from './auth';

const makeRes = () => ({ send: jest.fn() });
const makeNext = () => jest.fn();

const getFindOneMock = () => (AuthorizeModel as any).mock.results[0].value.Authorize.findOne;

describe('checkAuth', () => {
  beforeEach(() => {
    (global as any).conf = { authorization: {} };
    getFindOneMock().mockReset();
  });

  it('allows request when base64 token matches plain credentials from config list', async () => {
    (global as any).conf.authorization.list = [{ user: 'notification', password: 'secret-pass' }];
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

describe('checkAdminCookie', () => {
  const { checkAdminCookie, checkSameOrigin } = require('./auth');
  const adminCookie = crypto.createHmac('sha256', 'admin-pass').update('admin-login').digest('hex');

  beforeEach(() => {
    (global as any).conf = { adminConfig: { login: 'admin-login', password: 'admin-pass' } };
  });

  it('rejects a request without the admin cookie', () => {
    const res = makeRes();
    const next = makeNext();
    checkAdminCookie({ cookies: {} }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('rejects a wrong admin cookie', () => {
    const res = makeRes();
    const next = makeNext();
    checkAdminCookie({ cookies: { myCookie: 'x'.repeat(adminCookie.length) } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('rejects when admin credentials are not configured', () => {
    (global as any).conf = { adminConfig: {} };
    const res = makeRes();
    const next = makeNext();
    checkAdminCookie({ cookies: { myCookie: crypto.createHmac('sha256', '').update('').digest('hex') } }, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts the valid admin cookie', () => {
    const next = makeNext();
    checkAdminCookie({ cookies: { myCookie: adminCookie } }, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('checkSameOrigin rejects a foreign Origin and allows same or missing Origin', () => {
    const res = makeRes();
    const next = makeNext();
    checkSameOrigin({ headers: { origin: 'https://evil.example', host: 'n.local' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(403, expect.any(Object));
    checkSameOrigin({ headers: { origin: 'https://n.local', host: 'n.local' } }, makeRes(), next);
    checkSameOrigin({ headers: { host: 'n.local' } }, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
