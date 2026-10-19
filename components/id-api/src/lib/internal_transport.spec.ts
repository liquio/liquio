import https from 'node:https';

import type { Config } from '../config';
import { getInternalHttpsAgent, internalRequestOptions } from './internal_transport';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

describe('internal transport TLS', () => {
  it('uses the default verifying agent without a CA', () => {
    expect(getInternalHttpsAgent({} as Config)).toBeUndefined();
    expect(internalRequestOptions({ internalTransport: {} } as Config)).toEqual({});
  });

  it('trusts the configured CA and keeps verification on', () => {
    const config = { internalTransport: { ca: PEM } } as Config;
    const agent: any = getInternalHttpsAgent(config);
    expect(agent).toBeInstanceOf(https.Agent);
    expect(agent.options.rejectUnauthorized).toBe(true);
    expect(agent.options.ca).toEqual([PEM]);
    expect(internalRequestOptions(config)).toEqual({ httpsAgent: agent });
  });

  it('ignores an attempt to disable verification', () => {
    const config = { internalTransport: { ca: [PEM], rejectUnauthorized: false } } as unknown as Config;
    expect((getInternalHttpsAgent(config) as any).options.rejectUnauthorized).toBe(true);
  });
});
