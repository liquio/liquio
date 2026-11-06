import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loadHttpsOptions } from '../src/common/tls';
import { createE2eApp } from './helpers/create-app';

const mocks = path.join(__dirname, '..', 'src', 'x509', '__mocks__');
const certPath = path.join(mocks, 'ca-1.cert.pem');
const keyPath = path.join(mocks, 'ca-1.key.pem');

describe('loadHttpsOptions (e2e)', () => {
  it('returns undefined when TLS is off', () => {
    expect(loadHttpsOptions(undefined)).toBeUndefined();
    expect(loadHttpsOptions({ enabled: false })).toBeUndefined();
  });

  it('throws when certPath is missing', () => {
    expect(() => loadHttpsOptions({ enabled: true })).toThrow('tls.certPath is not set');
  });

  it('throws for an unreadable path', () => {
    expect(() => loadHttpsOptions({ enabled: true, certPath: '/nonexistent/cert.pem', keyPath })).toThrow('is not readable');
  });

  it('accepts a string enabled flag', () => {
    const opts = loadHttpsOptions({ enabled: 'true' as any, certPath, keyPath });
    expect(opts.requestCert).toBe(false);
  });

  it('requests client certs when caPath is set', () => {
    const opts = loadHttpsOptions({ enabled: true, certPath, keyPath, caPath: certPath });
    expect(opts.requestCert).toBe(true);
    expect(opts.rejectUnauthorized).toBe(false);
  });
});

describe('HTTPS app with mTLS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const httpsOptions = loadHttpsOptions({ enabled: true, certPath, keyPath, caPath: certPath });
    app = await createE2eApp({ httpsOptions });
  });
  afterAll(async () => {
    await app.close();
  });

  it('keeps the health path open without a client cert', async () => {
    await request(app.getHttpServer()).get('/test/ping').disableTLSCerts().expect(200);
  });

  it('rejects other paths without a client cert', async () => {
    const res = await request(app.getHttpServer()).get('/').disableTLSCerts().expect(401);
    expect(res.body).toEqual({ statusCode: 401, message: 'A valid client certificate is required' });
  });
});
