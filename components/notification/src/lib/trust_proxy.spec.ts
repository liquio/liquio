import express from 'express';
import request from 'supertest';

import { applyTrustProxy, resolveTrustProxy } from './trust_proxy';

const makeApp = (trustProxy?: unknown) => {
  const app = express();
  applyTrustProxy(app, trustProxy);
  app.get('/ip', (req, res) => {
    res.send({ ip: req.ip });
  });
  return app;
};

describe('resolveTrustProxy', () => {
  it('trusts nothing by default', () => {
    expect(resolveTrustProxy(undefined)).toBeUndefined();
    expect(resolveTrustProxy(0)).toBeUndefined();
    expect(resolveTrustProxy(false)).toBeUndefined();
    expect(resolveTrustProxy('')).toBeUndefined();
    expect(resolveTrustProxy([])).toBeUndefined();
  });

  it('rejects trust-everything values', () => {
    expect(resolveTrustProxy(true)).toBeUndefined();
    expect(resolveTrustProxy('true')).toBeUndefined();
    expect(resolveTrustProxy(-1)).toBeUndefined();
  });

  it('accepts hop counts, subnets and lists', () => {
    expect(resolveTrustProxy(1)).toBe(1);
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy('loopback')).toBe('loopback');
    expect(resolveTrustProxy(['10.0.0.0/8', 'loopback'])).toEqual(['10.0.0.0/8', 'loopback']);
  });
});

describe('applyTrustProxy', () => {
  it('ignores X-Forwarded-For when not configured (shared bucket, but not spoofable)', async () => {
    const res = await request(makeApp()).get('/ip').set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).not.toBe('203.0.113.7');
  });

  it('uses the client IP from X-Forwarded-For when one proxy hop is trusted', async () => {
    const res = await request(makeApp(1)).get('/ip').set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('does not trust a spoofed left-most entry beyond the trusted hops', async () => {
    const res = await request(makeApp(1)).get('/ip').set('X-Forwarded-For', '1.1.1.1, 203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('does not enable trust-all for true', async () => {
    const res = await request(makeApp(true)).get('/ip').set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).not.toBe('203.0.113.7');
  });
});
