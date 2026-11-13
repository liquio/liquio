import express from 'express';
import request from 'supertest';

import { prepareLoginHistoryData } from './login_history_extractor';

describe('prepareLoginHistoryData client IP (KS-33)', () => {
  const makeApp = (trustProxy?: number | string) => {
    const app = express();
    if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
    app.get('/', (req, res) => {
      (req as any).user = { userId: 'u1' };
      (req as any).session = {};
      res.send(prepareLoginHistoryData(req as any, { actionType: 'login' })?.ip);
    });
    return app;
  };

  it('ignores a spoofed X-Forwarded-For when trustProxy is not configured', async () => {
    const { body } = await request(makeApp()).get('/').set('X-Forwarded-For', '6.6.6.6, 7.7.7.7');
    expect(JSON.stringify(body)).not.toContain('6.6.6.6');
    expect(body).toHaveLength(1);
  });

  it('stores a single address, the last untrusted hop, behind one trusted proxy', async () => {
    const { body } = await request(makeApp(1)).get('/').set('X-Forwarded-For', '6.6.6.6, 203.0.113.9');
    expect(body).toEqual(['203.0.113.9']);
  });
});
