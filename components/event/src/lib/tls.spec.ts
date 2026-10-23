import fs from 'node:fs';
import path from 'node:path';

import axios from 'axios';

import { buildHttpsAgent, installTlsOverrides } from './tls';

describe('tls', () => {
  describe('buildHttpsAgent', () => {
    it('returns no agent by default', () => {
      expect(buildHttpsAgent()).toBeUndefined();
      expect(buildHttpsAgent({})).toBeUndefined();
      expect(buildHttpsAgent({ allowInsecureTls: false, ca: [] })).toBeUndefined();
    });

    it('disables verification only when allowInsecureTls is true', () => {
      const agent: any = buildHttpsAgent({ allowInsecureTls: true });
      expect(agent.options.rejectUnauthorized).toBe(false);
    });

    it('uses custom CA without disabling verification', () => {
      const agent: any = buildHttpsAgent({ ca: 'PEM' });
      expect(agent.options.ca).toBe('PEM');
      expect(agent.options.rejectUnauthorized).not.toBe(false);
    });
  });

  describe('installTlsOverrides', () => {
    const run = async (instance: any, url: string) => {
      const handler = instance.interceptors.request.handlers[0].fulfilled;
      return handler({ url });
    };

    it('applies agent only to the configured origin and warns', async () => {
      const instance = axios.create();
      const warn = jest.fn();
      installTlsOverrides([{ url: 'https://internal.local:8443/api', allowInsecureTls: true }], warn, instance);
      expect(warn).toHaveBeenCalledTimes(1);

      const internal = await run(instance, 'https://internal.local:8443/files/1');
      expect(internal.httpsAgent.options.rejectUnauthorized).toBe(false);
      const other = await run(instance, 'https://other.local/files/1');
      expect(other.httpsAgent).toBeUndefined();
    });

    it('installs nothing when no endpoint opts in', () => {
      const instance = axios.create();
      installTlsOverrides([{ url: 'https://internal.local' }, { url: undefined as any, allowInsecureTls: true }], undefined, instance);
      expect((instance.interceptors.request as any).handlers).toHaveLength(0);
    });
  });

  it('app.ts does not disable TLS verification process-wide', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app.ts'), 'utf8');
    expect(source).not.toContain('NODE_TLS_REJECT_UNAUTHORIZED');
  });
});
