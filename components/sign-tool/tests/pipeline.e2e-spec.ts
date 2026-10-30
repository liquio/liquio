import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { captureLogs, createE2eApp, pinClock, setEnv } from './helpers/create-app';

const mocks = path.join(__dirname, '..', 'src', 'x509', '__mocks__');
const sign1 = fs.readFileSync(path.join(mocks, 'sample-1.json.p7s')).toString('base64');

describe('pipeline (e2e)', () => {
  let app: INestApplication;
  let cap: ReturnType<typeof captureLogs>;

  beforeAll(async () => {
    cap = captureLogs();
    app = await createE2eApp();
  });
  afterAll(async () => {
    await app.close();
    cap.stop();
  });
  beforeEach(() => {
    cap.lines.length = 0;
  });

  it('GET / returns pong', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('pong');
  });

  it('GET /test/ping returns process info', async () => {
    const res = await request(app.getHttpServer()).get('/test/ping').expect(200);
    expect(res.body).toEqual({ data: { processPid: expect.any(Number), message: 'pong' } });
  });

  it('rejects a 70kB body with 413 and accepts a 10kB one', async () => {
    await request(app.getHttpServer())
      .post('/x509/signature-info')
      .send({ sign: 'a'.repeat(70 * 1024) })
      .expect(413);
    const res = await request(app.getHttpServer())
      .post('/x509/signature-info')
      .send({ sign: 'a'.repeat(10 * 1024) });
    expect(res.status).not.toBe(413);
  });

  it('logs http-request and http-response lines', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
    const req = cap.lines.find((l) => l.type === 'http-request');
    const resp = cap.lines.find((l) => l.type === 'http-response');
    expect(req.data).toMatchObject({ method: 'GET', url: '/' });
    expect(resp.data).toMatchObject({ method: 'GET', url: '/', status: 200 });
    expect(req.appInfo.name).toBe('liquio-sign-tool');
  });

  it('logs error-cause and an error http-response for a 400', async () => {
    pinClock();
    try {
      await request(app.getHttpServer()).post('/x509/signature-info').send({ sign: 'bm90LWEtc2lnbmF0dXJl' }).expect(400);
    } finally {
      jest.useRealTimers();
    }
    const cause = cap.lines.find((l) => l.type === 'error-cause');
    expect(cause.data.message).toBe('Invalid signature data');
    expect(cause.data.cause).toBeDefined();
    const resp = cap.lines.find((l) => l.type === 'http-response' && l.level === 'error');
    expect(resp.data.status).toBe(400);
  });

  it('logs the loaded CA cert at startup', async () => {
    const local = captureLogs();
    const other = await createE2eApp();
    local.stop();
    await other.close();
    expect(local.lines.some((l) => l.type.startsWith('Loaded CA cert: Liquio Test CA'))).toBe(true);
  });

  it('warns and rejects signatures when no CA is configured', async () => {
    const restore = setEnv({ LIQUIO_CFG_SIGN_TOOL_x509: JSON.stringify({ caCerts: [] }) });
    const local = captureLogs();
    let other: INestApplication;
    try {
      other = await createE2eApp();
    } finally {
      restore();
      local.stop();
    }
    expect(local.lines.some((l) => l.type.startsWith('No trusted CA certificates configured'))).toBe(true);
    pinClock();
    try {
      await request(other.getHttpServer()).post('/x509/signature-info').send({ sign: sign1 }).expect(400);
    } finally {
      jest.useRealTimers();
      await other.close();
    }
  });
});
