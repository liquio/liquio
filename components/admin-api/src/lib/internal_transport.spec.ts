import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';

import { setAppContext, resetAppContext } from './context';
import { getInternalHttpsAgent, getPlainHttpInternalUrls, warnPlainHttpInternalUrls } from './internal_transport';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
const KEY = '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----';

describe('internal_transport', () => {
  let save: jest.Mock;

  afterEach(() => {
    resetAppContext();
  });

  beforeEach(() => {
    save = jest.fn();
    setAppContext({ log: { save } });
  });

  describe('getInternalHttpsAgent', () => {
    it('returns undefined without config so the default verifying agent is used', () => {
      expect(getInternalHttpsAgent({})).toBeUndefined();
      expect(getInternalHttpsAgent({ internal_transport: { allowPlainHttp: true } })).toBeUndefined();
      expect(getInternalHttpsAgent({ internal_transport: { ca: [] } })).toBeUndefined();
    });

    it('trusts the configured CA and keeps verification on', () => {
      const agent: any = getInternalHttpsAgent({ internal_transport: { ca: PEM } });
      expect(agent).toBeInstanceOf(https.Agent);
      expect(agent.options.rejectUnauthorized).toBe(true);
      expect(agent.options.ca).toEqual([PEM]);
    });

    it('reads the CA from a file path', () => {
      const file = path.join(os.tmpdir(), `admin-api-it-${process.pid}.pem`);
      fs.writeFileSync(file, PEM);
      try {
        const agent: any = getInternalHttpsAgent({ internal_transport: { ca: [file] } });
        expect(agent.options.ca).toEqual([PEM]);
      } finally {
        fs.unlinkSync(file);
      }
    });

    it('ignores an attempt to disable verification', () => {
      const agent: any = getInternalHttpsAgent({ internal_transport: { ca: PEM, rejectUnauthorized: false } });
      expect(agent.options.rejectUnauthorized).toBe(true);
    });

    it('presents a client certificate when cert and key are set', () => {
      const agent: any = getInternalHttpsAgent({ internal_transport: { ca: PEM, cert: PEM, key: KEY } });
      expect(agent.options.cert).toBe(PEM);
      expect(agent.options.key).toBe(KEY);
      expect(agent.options.rejectUnauthorized).toBe(true);
    });
  });

  describe('warnPlainHttpInternalUrls', () => {
    const config = (extra: Record<string, any> = {}) => ({
      notifier: { server: 'http://notification' },
      sign: { url: 'https://sign' },
      system_notifier: { email: { server: 'http://notification' } },
      ...extra,
    });

    it('lists plain http urls only', () => {
      expect(Object.keys(getPlainHttpInternalUrls(config()))).toEqual(['notifier.server', 'system_notifier.email.server']);
    });

    it('warns in production', () => {
      expect(warnPlainHttpInternalUrls(config(), 'production')).toEqual(['notifier.server', 'system_notifier.email.server']);
      expect(save).toHaveBeenCalledWith('internal-service-plain-http', expect.objectContaining({ keys: expect.any(Array) }), 'warn');
      expect(warnPlainHttpInternalUrls(config(), 'prod')).toHaveLength(2);
    });

    it('does not warn with the opt-in, outside production, or for https', () => {
      expect(warnPlainHttpInternalUrls(config({ internal_transport: { allowPlainHttp: true } }), 'production')).toEqual([]);
      expect(warnPlainHttpInternalUrls(config(), 'development')).toEqual([]);
      expect(warnPlainHttpInternalUrls({ notifier: { server: 'https://n' } }, 'production')).toEqual([]);
      expect(save).not.toHaveBeenCalled();
    });
  });
});
