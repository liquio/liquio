import fs from 'node:fs';
import https from 'node:https';

import { getConfig, getLog } from './context';

const PRODUCTION_ENVS = ['production', 'prod'];

type PemOrPath = string | string[];

const toPem = (value: string) => (value.includes('-----BEGIN') ? value : fs.readFileSync(value, 'utf8'));
const toList = (value: PemOrPath) => (Array.isArray(value) ? value : [value]);

const agents = new WeakMap<object, https.Agent | undefined>();

/**
 * HTTPS agent for calls to internal services (notification, sign-tool).
 * Trusts the extra CA(s) from `internal_transport.ca` (PEM string or path to a PEM file) and optionally presents the
 * client certificate `internal_transport.cert` + `internal_transport.key` (mTLS).
 * Certificate verification is always on; there is no option to turn it off.
 * Returns undefined when neither CA nor client certificate is configured, so axios uses its default (verifying) agent.
 * @param {Record<string, any>} [config] Config. Defaults to global config.
 * @returns {https.Agent|undefined}
 */
export function getInternalHttpsAgent(config: Record<string, any> = getConfig()): https.Agent | undefined {
  const transport = config?.internal_transport;
  if (!transport) {
    return undefined;
  }
  const { ca, cert, key } = transport;
  const hasCa = !!ca && !(Array.isArray(ca) && ca.length === 0);
  const hasClientCert = !!cert && !!key;
  if (!hasCa && !hasClientCert) {
    return undefined;
  }
  if (!agents.has(config)) {
    const options: https.AgentOptions = { rejectUnauthorized: true };
    if (hasCa) {
      options.ca = toList(ca).map(toPem);
    }
    if (hasClientCert) {
      options.cert = toPem(cert);
      options.key = toPem(key);
    }
    agents.set(config, new https.Agent(options));
  }
  return agents.get(config);
}

/**
 * Plain `http://` internal service URLs configured for notification and sign-tool.
 * @param {Record<string, any>} config Config.
 * @returns {Record<string, string>} Config key -> url.
 */
export function getPlainHttpInternalUrls(config: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  const candidates: Record<string, any> = {
    'notifier.server': config?.notifier?.server,
    'system_notifier.email.server': config?.system_notifier?.email?.server,
    'sign.url': config?.sign?.url,
  };
  for (const [name, url] of Object.entries(candidates)) {
    if (typeof url === 'string' && /^http:\/\//i.test(url.trim())) {
      result[name] = url;
    }
  }
  return result;
}

/**
 * Warn about plain-http internal service URLs in production, unless `internal_transport.allowPlainHttp` is set.
 * Does not refuse to start: shipped Helm values still use http for in-cluster calls (protected by NetworkPolicies).
 * @param {Record<string, any>} config Config.
 * @param {string} [env] NODE_ENV.
 * @returns {string[]} Offending config keys (empty when nothing to warn about).
 */
export function warnPlainHttpInternalUrls(config: Record<string, any>, env: string | undefined = process.env.NODE_ENV): string[] {
  if (!env || !PRODUCTION_ENVS.includes(env) || config?.internal_transport?.allowPlainHttp === true) {
    return [];
  }
  const keys = Object.keys(getPlainHttpInternalUrls(config));
  if (keys.length > 0) {
    getLog()?.save(
      'internal-service-plain-http',
      {
        keys,
        hint: 'Use https:// with internal_transport.ca, or set internal_transport.allowPlainHttp=true when NetworkPolicy/mesh mTLS protects the traffic.',
      },
      'warn',
    );
  }
  return keys;
}
