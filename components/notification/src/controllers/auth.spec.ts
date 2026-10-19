import crypto from 'node:crypto';

jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));

import { AuthorizeModel } from '../models/authorize';
import { checkAuth, checkConfigAuth, clearDigestNoncesForTests } from './auth';

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
  const { createAdminSession, destroyAdminSession, ADMIN_COOKIE_NAME } = require('./adminSession');

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

  it('rejects the old static HMAC cookie derived from the credentials', () => {
    const hmac = crypto.createHmac('sha256', 'admin-pass').update('admin-login').digest('hex');
    const res = makeRes();
    const next = makeNext();
    checkAdminCookie({ cookies: { [ADMIN_COOKIE_NAME]: hmac, myCookie: hmac } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('accepts a live session and rejects it after logout', () => {
    const req = { cookies: { [ADMIN_COOKIE_NAME]: createAdminSession() } };
    const next = makeNext();
    checkAdminCookie(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    destroyAdminSession(req);
    const res = makeRes();
    checkAdminCookie(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(401, expect.any(Object));
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

describe('checkConfigAuth (Digest, NT-05)', () => {
  const md5 = (v: string) => crypto.createHash('md5').update(v).digest('hex');
  const realm = 'Digest Authenticatoin';
  const password = 'client-pass';

  const challenge = async (url = '/configs') => {
    const res: any = { send: jest.fn(), header: jest.fn() };
    await checkConfigAuth({ headers: {}, method: 'GET', originalUrl: url }, res, jest.fn());
    const header: string = res.header.mock.calls[0][1];
    return { res, nonce: /nonce="([^"]+)"/.exec(header)![1] };
  };

  const sign = (nonce: string, nc: string, { uri = '/configs', method = 'GET', pass = password, user = 'client' } = {}) => {
    const cnonce = 'abc';
    const response = md5([md5(`${user}:${realm}:${pass}`), nonce, nc, cnonce, 'auth', md5(`${method}:${uri}`)].join(':'));
    return `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  };

  const attempt = async (authorization: string, url = '/configs') => {
    const res: any = { send: jest.fn(), header: jest.fn() };
    const next = jest.fn();
    await checkConfigAuth({ headers: { authorization }, method: 'GET', originalUrl: url }, res, next);
    return { res, next };
  };

  beforeEach(() => {
    (global as any).conf = { adminConfig: { login: 'a', password: 'admin-pass' } };
    getFindOneMock()
      .mockReset()
      .mockImplementation(async ({ where }: any) => (where.login === 'client' ? { login: 'client', password } : null));
    clearDigestNoncesForTests();
  });

  it('issues unpredictable signed nonces', async () => {
    const a = await challenge();
    const b = await challenge();
    expect(a.nonce).toMatch(/^[0-9a-f]+\.[0-9a-f]{32}\.[0-9a-f]{64}$/);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('accepts a valid response for a server-issued nonce', async () => {
    const { nonce } = await challenge();
    const { next } = await attempt(sign(nonce, '00000001'));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a nonce the server never issued', async () => {
    const { next, res } = await attempt(sign('0.0.0', '00000001'));
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, expect.objectContaining({ message: 'Nonce not valid or expired' }));
  });

  it('rejects an expired nonce', async () => {
    const { nonce } = await challenge();
    const realNow = Date.now;
    Date.now = () => realNow() + 6 * 60 * 1000;
    try {
      const { next } = await attempt(sign(nonce, '00000001'));
      expect(next).not.toHaveBeenCalled();
    } finally {
      Date.now = realNow;
    }
  });

  it('rejects a replayed header (same nonce and nc) but accepts an increased nc', async () => {
    const { nonce } = await challenge();
    expect((await attempt(sign(nonce, '00000001'))).next).toHaveBeenCalledTimes(1);
    const replay = await attempt(sign(nonce, '00000001'));
    expect(replay.next).not.toHaveBeenCalled();
    expect(replay.res.send).toHaveBeenCalledWith(401, expect.objectContaining({ message: 'Nonce count not valid' }));
    expect((await attempt(sign(nonce, '00000002'))).next).toHaveBeenCalledTimes(1);
  });

  it('rejects a header signed for another uri than the requested one', async () => {
    const { nonce } = await challenge();
    const { next, res } = await attempt(sign(nonce, '00000001', { uri: '/configs/1', method: 'GET' }), '/configs');
    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(401, expect.objectContaining({ message: 'Not valid uri' }));
  });

  it('rejects a wrong password and does not burn the nonce counter', async () => {
    const { nonce } = await challenge();
    expect((await attempt(sign(nonce, '00000001', { pass: 'bad' }))).next).not.toHaveBeenCalled();
    expect((await attempt(sign(nonce, '00000001'))).next).toHaveBeenCalledTimes(1);
  });

  it('answers malformed headers with a challenge instead of throwing', async () => {
    for (const header of ['Digest garbage', 'Digest username=', 'Digest =,=', 'Basic abc']) {
      const { next, res } = await attempt(header);
      expect(next).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(401, expect.any(Object));
    }
  });

  it('keeps credentials per request (concurrent logins of different users do not cross)', async () => {
    getFindOneMock().mockImplementation(async ({ where }: any) => ({ login: where.login, password: `pw-${where.login}` }));
    const [n1, n2] = [(await challenge()).nonce, (await challenge()).nonce];
    const results = await Promise.all([
      attempt(sign(n1, '00000001', { user: 'u1', pass: 'pw-u1' })),
      attempt(sign(n2, '00000001', { user: 'u2', pass: 'pw-u1' })),
    ]);
    expect(results[0].next).toHaveBeenCalledTimes(1);
    expect(results[1].next).not.toHaveBeenCalled();
  });
});
