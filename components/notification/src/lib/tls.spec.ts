import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';

import { createHttpsAgent } from './tls';

const TLS_ENV = ['NODE_TLS', 'REJECT_UNAUTHORIZED'].join('_');
const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

jest.mock('axios', () => jest.fn(async () => ({ data: 'ok' })));
jest.mock('../models/sms_queue', () => ({ SmsQueueModel: jest.fn(() => ({ SmsQueue: {} })) }));
jest.mock('../config/config', () => ({ smsServer: { tls: { ca: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----' } } }));

describe('createHttpsAgent', () => {
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
    const file = path.join(os.tmpdir(), `nt-tls-${process.pid}.pem`);
    fs.writeFileSync(file, PEM);
    try {
      const agent: any = createHttpsAgent({ ca: [file] });
      expect(agent.options.ca).toEqual([PEM]);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('disables verification only when explicitly configured', () => {
    expect((createHttpsAgent({ rejectUnauthorized: false }) as any).options.rejectUnauthorized).toBe(false);
    expect((createHttpsAgent({ rejectUnauthorized: true }) as any).options.rejectUnauthorized).toBe(true);
  });
});

describe('AbstractGate TLS', () => {
  it('does not change process-wide TLS verification env variable', async () => {
    const before = process.env[TLS_ENV];
    const { AbstractGate } = await import('../models/smsGate/abstractSmsGate');
    new AbstractGate();
    expect(process.env[TLS_ENV]).toBe(before);
  });

  it('sendRequest passes https agent built from smsServer.tls without mutating options', async () => {
    const axios: any = require('axios');
    const { AbstractGate } = await import('../models/smsGate/abstractSmsGate');
    const options: any = { url: 'https://sms.local' };
    await new AbstractGate().sendRequest(options);
    const called = axios.mock.calls[0][0];
    expect(called.httpsAgent).toBeInstanceOf(https.Agent);
    expect(called.httpsAgent.options.ca).toEqual([PEM]);
    expect(options.httpsAgent).toBeUndefined();
  });

  it('notification src never sets the global TLS-verification env variable', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const offenders = walk(path.join(__dirname, '..'))
      .filter((f) => /\.(ts|js)$/.test(f))
      .filter((f) => fs.readFileSync(f, 'utf8').includes(TLS_ENV));
    expect(offenders).toEqual([]);
  });
});
