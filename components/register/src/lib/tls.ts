import fs from 'node:fs';
import https from 'node:https';

/**
 * TLS options for outgoing HTTPS connections.
 * @property {string|string[]} [ca] Extra CA certificate(s): PEM string or path to a PEM file.
 * @property {string} [cert] Client certificate (PEM string or path) for mTLS; used together with `key`.
 * @property {string} [key] Client private key (PEM string or path) for mTLS.
 * @property {boolean} [rejectUnauthorized] Verify server certificate. Default true.
 */
export interface TlsConfig {
  ca?: string | string[];
  cert?: string;
  key?: string;
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
  const hasClientCert = !!tls?.cert && !!tls?.key;
  if (!tls || (tls.ca === undefined && tls.rejectUnauthorized === undefined && !hasClientCert)) {
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

  if (hasClientCert) {
    options.cert = resolveCa(tls.cert as string);
    options.key = resolveCa(tls.key as string);
  }

  return new https.Agent(options);
}
