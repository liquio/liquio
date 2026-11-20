import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';

const mockGate = {
  removeFromQueue: jest.fn(),
  removeAllFromQueue: jest.fn(),
  retrySendInQueue: jest.fn(),
  retrySendAllInQueue: jest.fn(),
};

jest.mock('../models/smsGate/messangerModel', () => ({
  MessangerModel: class {
    removeFromQueue = (...args: any[]) => mockGate.removeFromQueue(...args);
    removeAllFromQueue = (...args: any[]) => mockGate.removeAllFromQueue(...args);
    retrySendInQueue = (...args: any[]) => mockGate.retrySendInQueue(...args);
    retrySendAllInQueue = (...args: any[]) => mockGate.retrySendAllInQueue(...args);
  },
}));
jest.mock('../models/authorize', () => ({
  AuthorizeModel: jest.fn().mockImplementation(() => ({ Authorize: { findOne: jest.fn() } })),
}));

import { responseEncodingMiddleware } from '../middleware/security';
import { StaticRoutes } from './staticRoutes';
import { createAdminSession, ADMIN_COOKIE_NAME, clearAdminSessionsForTests } from './adminSession';
import { setAppContext, resetAppContext } from '../lib/context';

describe('admin queue routes (NT-06)', () => {
  let request: supertest.Agent;
  let cookie: string;

  afterAll(() => resetAppContext());

  beforeAll(() => {
    setAppContext({ conf: { adminConfig: { login: 'l', password: 'p' } } });
    const app = express();
    app.use(express.json());
    app.use(responseEncodingMiddleware());
    app.use(cookieParser());
    new StaticRoutes(app);
    request = supertest(app) as any;
  });

  beforeEach(() => {
    Object.values(mockGate).forEach((m) => m.mockReset().mockResolvedValue({ queue: [] }));
    cookie = `${ADMIN_COOKIE_NAME}=${createAdminSession()}`;
  });

  afterAll(() => clearAdminSessionsForTests());

  it.each(['/admin/api/queue/clear/1', '/admin/api/queue/clear/undefined', '/admin/api/queue/resend/1', '/admin/api/queue/resend'])(
    'GET %s no longer changes state',
    async (url) => {
      const res = await request.get(url).set('Cookie', cookie);
      expect(res.status).toBe(404);
      expect(mockGate.removeFromQueue).not.toHaveBeenCalled();
      expect(mockGate.retrySendInQueue).not.toHaveBeenCalled();
    },
  );

  it('POST clear without a session is rejected', async () => {
    const res = await request.post('/admin/api/queue/clear/1').send({});
    expect(res.status).toBe(401);
    expect(mockGate.removeFromQueue).not.toHaveBeenCalled();
  });

  it('POST clear with a foreign Origin is rejected even with a session', async () => {
    const res = await request.post('/admin/api/queue/clear/1').set('Cookie', cookie).set('Origin', 'https://evil.example').send({});
    expect(res.status).toBe(403);
    expect(mockGate.removeFromQueue).not.toHaveBeenCalled();
  });

  it.each(['undefined', 'abc', '0', '-1', '1.5', '1e3', '99999999999'])('POST clear/%s answers 400 and never truncates', async (id) => {
    const res = await request.post(`/admin/api/queue/clear/${id}`).set('Cookie', cookie).send({});
    expect(res.status).toBe(400);
    expect(mockGate.removeFromQueue).not.toHaveBeenCalled();
    expect(mockGate.removeAllFromQueue).not.toHaveBeenCalled();
  });

  it('POST clear/:id removes exactly that id', async () => {
    const res = await request.post('/admin/api/queue/clear/42').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    expect(mockGate.removeFromQueue).toHaveBeenCalledWith(42);
    expect(mockGate.removeAllFromQueue).not.toHaveBeenCalled();
  });

  it('POST clear-all needs { confirm: true }', async () => {
    expect((await request.post('/admin/api/queue/clear-all').set('Cookie', cookie).send({})).status).toBe(400);
    expect((await request.post('/admin/api/queue/clear-all').set('Cookie', cookie).send({ confirm: 'true' })).status).toBe(400);
    expect(mockGate.removeAllFromQueue).not.toHaveBeenCalled();
    expect((await request.post('/admin/api/queue/clear-all').set('Cookie', cookie).send({ confirm: true })).status).toBe(200);
    expect(mockGate.removeAllFromQueue).toHaveBeenCalledTimes(1);
  });

  it('POST resend validates the id and resend-all needs confirm', async () => {
    expect((await request.post('/admin/api/queue/resend/undefined').set('Cookie', cookie).send({})).status).toBe(400);
    expect((await request.post('/admin/api/queue/resend-all').set('Cookie', cookie).send({})).status).toBe(400);
    expect(mockGate.retrySendInQueue).not.toHaveBeenCalled();
    expect(mockGate.retrySendAllInQueue).not.toHaveBeenCalled();
    expect((await request.post('/admin/api/queue/resend/7').set('Cookie', cookie).send({})).status).toBe(200);
    expect(mockGate.retrySendInQueue).toHaveBeenCalledWith(7);
    expect((await request.post('/admin/api/queue/resend-all').set('Cookie', cookie).send({ confirm: true })).status).toBe(200);
    expect(mockGate.retrySendAllInQueue).toHaveBeenCalledTimes(1);
  });
});
