import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';

import { createHttpsAgent } from './tls';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

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
    const file = path.join(os.tmpdir(), `fs-tls-${process.pid}.pem`);
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

describe('process-wide TLS override', () => {
  it('app.ts does not disable TLS verification', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app.ts'), 'utf8');
    expect(source).not.toContain('NODE_TLS_REJECT_UNAUTHORIZED');
  });
});
