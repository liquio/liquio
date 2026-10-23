import http from 'http';
import { AddressInfo } from 'net';

import express from 'express';
import proxy from 'express-http-proxy';
import request from 'supertest';

import { getProxyReadOnlyGuard } from './router';
import { SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT, READONLY_SUPPORT_ADMIN_UNIT } from '../constants/unit';

describe('Proxy read-only guard', () => {
  let destination: http.Server;
  let destinationHits: string[];
  let units: number[] = [];

  const buildApp = (allowedUnits: number[]) => {
    const app = express();
    // Stub of the auth middleware.
    app.use((req, _res, next) => {
      const header = req.headers['x-test-units'];
      if (header) (req as any).authUserUnitIds = { all: String(header).split(',').map(Number) };
      next();
    });
    app.use('/p', getProxyReadOnlyGuard(allowedUnits), proxy(`http://127.0.0.1:${(destination.address() as AddressInfo).port}`));
    return app;
  };

  beforeAll(async () => {
    destinationHits = [];
    destination = http.createServer((req, res) => {
      destinationHits.push(req.method as string);
      res.end('ok');
    });
    await new Promise<void>((r) => destination.listen(0, '127.0.0.1', r));
    units = [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT, READONLY_SUPPORT_ADMIN_UNIT];
  });

  afterAll(async () => {
    await new Promise((r) => destination.close(r));
  });

  beforeEach(() => {
    destinationHits.length = 0;
  });

  it('should pass GET for a read-only unit', async () => {
    const res = await request(buildApp(units)).get('/p/x').set('x-test-units', String(READONLY_SYSTEM_ADMIN_UNIT));
    expect(res.status).toBe(200);
    expect(destinationHits).toEqual(['GET']);
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)('should reject %s for a read-only unit', async (method) => {
    const res = await request(buildApp(units))[method]('/p/x').set('x-test-units', String(READONLY_SYSTEM_ADMIN_UNIT));
    expect(res.status).toBe(403);
    expect(destinationHits).toEqual([]);
  });

  it('should pass POST for a system admin', async () => {
    const res = await request(buildApp(units)).post('/p/x').set('x-test-units', String(SYSTEM_ADMIN_UNIT));
    expect(res.status).toBe(200);
    expect(destinationHits).toEqual(['POST']);
  });

  it('should pass POST for a user with both read-only and writable units', async () => {
    const res = await request(buildApp(units)).post('/p/x').set('x-test-units', `${READONLY_SYSTEM_ADMIN_UNIT},${SUPPORT_ADMIN_UNIT}`);
    expect(res.status).toBe(200);
  });

  it('should pass POST without user units (server token)', async () => {
    const res = await request(buildApp(units)).post('/p/x');
    expect(res.status).toBe(200);
  });
});
