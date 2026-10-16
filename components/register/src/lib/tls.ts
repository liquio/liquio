import fs from 'node:fs';
import https from 'node:https';

/**
 * TLS options for outgoing HTTPS connections.
 * @property {string|string[]} [ca] Extra CA certificate(s): PEM string or path to a PEM file.
 * @property {boolean} [rejectUnauthorized] Verify server certificate. Default true.
 */
export interface TlsConfig {
  ca?: string | string[];
  rejectUnauthorized?: boolean;
}

const resolveCa = (ca: string) => (ca.includes('-----BEGIN') ? ca : fs.readFileSync(ca, 'utf8'));

/**
 * Create HTTPS agent from optional TLS config.
 * Returns undefined when no TLS config is provided, so default (verifying) agent is used.
 * Disabling verification is an explicit opt-out and is logged.
 * @param {TlsConfig} [tls] TLS config.
 * @param {string} [target] Target name for the log.
 * @returns {https.Agent|undefined}
 */
export function createHttpsAgent(tls?: TlsConfig, target?: string): https.Agent | undefined {
  if (!tls || (tls.ca === undefined && tls.rejectUnauthorized === undefined)) {
    return undefined;
  }

  const options: https.AgentOptions = { rejectUnauthorized: tls.rejectUnauthorized !== false };
  if (options.rejectUnauthorized === false) {
    global.log?.save(
      'tls-verification-disabled',
      { target, message: 'TLS certificate verification is disabled by config (tls.rejectUnauthorized=false).' },
      'warn',
    );
  }
  if (tls.ca) {
    options.ca = (Array.isArray(tls.ca) ? tls.ca : [tls.ca]).map(resolveCa);
  }

  return new https.Agent(options);
}
