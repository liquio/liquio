import fs from 'node:fs';
import https from 'node:https';

import type { Config } from '../config';

const resolveCa = (ca: string) => (ca.includes('-----BEGIN') ? ca : fs.readFileSync(ca, 'utf8'));

const agents = new WeakMap<object, https.Agent | undefined>();

/**
 * HTTPS agent for calls to internal services (notification, sign-tool).
 * Trusts the extra CA(s) from `internalTransport.ca` (PEM string or path to a PEM file) (replacing the default
 * trust store for these calls, like the register/event/notification services). Certificate verification is always on; there is no option to turn it off.
 * Returns undefined when no CA is configured, so axios uses its default (verifying) agent.
 */
export function getInternalHttpsAgent(config: Config): https.Agent | undefined {
  const ca = config.internalTransport?.ca;
  if (!ca || (Array.isArray(ca) && ca.length === 0)) {
    return undefined;
  }
  if (!agents.has(config)) {
    agents.set(config, new https.Agent({ rejectUnauthorized: true, ca: (Array.isArray(ca) ? ca : [ca]).map(resolveCa) }));
  }
  return agents.get(config);
}

/**
 * Extra axios options for internal service calls: `{ httpsAgent }` when a CA is configured, otherwise `{}`.
 */
export function internalRequestOptions(config: Config): { httpsAgent?: https.Agent } {
  const httpsAgent = getInternalHttpsAgent(config);
  return httpsAgent ? { httpsAgent } : {};
}
