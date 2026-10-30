import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';

import { createHttpsAgent } from './tls';
import HttpRequest from './http_request';
import Sign from './sign';

const TLS_ENV = ['NODE_TLS', 'REJECT_UNAUTHORIZED'].join('_');
const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));
jest.mock('axios', () => jest.fn(async () => ({ data: '{"ok":true}' })));

describe('createHttpsAgent', () => {
  beforeEach(() => {
    (global as any).log = { save: jest.fn() };
  });

  it('returns undefined without tls config so default verifying agent is used', () => {
    expect(createHttpsAgent()).toBeUndefined();
    expect(createHttpsAgent({})).toBeUndefined();
  });

  it('verifies certificates by default when CA is given', () => {
    const agent: any = createHttpsAgent({ ca: PEM });
    expect(agent).toBeInstanceOf(https.Agent);
    expect(agent.options.rejectUnauthorized).toBe(true);
    expect(agent.options.ca).toEqual([PEM]);
  });

  it('reads CA from file path', () => {
    const file = path.join(os.tmpdir(), `rg-tls-${process.pid}.pem`);
    fs.writeFileSync(file, PEM);
    try {
      const agent: any = createHttpsAgent({ ca: [file] });
      expect(agent.options.ca).toEqual([PEM]);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('disables verification only when explicitly configured, and logs it', () => {
    expect((createHttpsAgent({ rejectUnauthorized: false }, 't') as any).options.rejectUnauthorized).toBe(false);
    expect((global as any).log.save).toHaveBeenCalledWith('tls-verification-disabled', expect.objectContaining({ target: 't' }), 'warn');
    expect((createHttpsAgent({ rejectUnauthorized: true }) as any).options.rejectUnauthorized).toBe(true);
  });
});

describe('createHttpsAgent mTLS', () => {
  it('presents a client certificate when cert and key are set, keeping verification on', () => {
    const KEY = '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----';
    const agent: any = createHttpsAgent({ cert: PEM, key: KEY });
    expect(agent.options.cert).toBe(PEM);
    expect(agent.options.key).toBe(KEY);
    expect(agent.options.rejectUnauthorized).toBe(true);
  });

  it('ignores a cert without a key', () => {
    expect(createHttpsAgent({ cert: PEM })).toBeUndefined();
  });
});

describe('register TLS wiring', () => {
  const axios: any = require('axios');

  beforeEach(() => {
    axios.mockClear();
    (global as any).log = { save: jest.fn() };
  });

  it('HttpRequest.send passes https agent from tls option and strips tls', async () => {
    await HttpRequest.send({ url: 'https://x', method: 'GET', tls: { ca: PEM } });
    const called = axios.mock.calls[0][0];
    expect(called.httpsAgent).toBeInstanceOf(https.Agent);
    expect(called.tls).toBeUndefined();
  });

  it('HttpRequest.send uses default agent without tls option', async () => {
    await HttpRequest.send({ url: 'https://x', method: 'GET' });
    expect(axios.mock.calls[0][0].httpsAgent).toBeUndefined();
  });

  it('Sign passes https agent from sign tls config', async () => {
    const sign = new Sign({ url: 'https://sign', token: 't', tls: { ca: PEM } });
    await sign.verifySignatureExternal('d', 's');
    expect(axios.mock.calls[0][0].httpsAgent).toBeInstanceOf(https.Agent);
  });

  it('register src never sets the global TLS-verification env variable', () => {
    expect(process.env[TLS_ENV]).not.toBe('0');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const offenders = walk(path.join(__dirname, '..'))
      .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('tls.spec.ts'))
      .filter((f) => fs.readFileSync(f, 'utf8').includes(TLS_ENV));
    expect(offenders).toEqual([]);
  });
});
