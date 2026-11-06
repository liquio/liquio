import { readFileSync } from 'fs';
import type { TLSSocket } from 'tls';

// Probe paths that stay reachable without a client certificate (kubelet probes cannot present one).
export const TLS_HEALTH_PATHS = ['/test/ping'];

export interface TlsConfig {
  enabled?: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export interface HttpsOptions {
  cert: Buffer;
  key: Buffer;
  ca?: Buffer;
  requestCert: boolean;
  rejectUnauthorized: boolean;
}

function readFile(label: string, filePath?: string): Buffer {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error(`TLS is enabled but tls.${label} is not set.`);
  }
  try {
    return readFileSync(filePath);
  } catch (error) {
    throw new Error(`TLS is enabled but tls.${label} "${filePath}" is not readable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load HTTPS options. Returns undefined when TLS is off (default). Throws on missing/unreadable files.
 * With caPath set, client certificates are requested (mTLS) and enforced by `requireClientCert`
 * rather than at the handshake, so health probes keep working.
 */
export function loadHttpsOptions(tls?: TlsConfig): HttpsOptions | undefined {
  if (!tls || !(tls.enabled === true || (tls.enabled as unknown) === 'true')) {
    return undefined;
  }
  const cert = readFile('certPath', tls.certPath);
  const key = readFile('keyPath', tls.keyPath);
  const ca = tls.caPath ? readFile('caPath', tls.caPath) : undefined;
  return { cert, key, ca, requestCert: !!ca, rejectUnauthorized: false };
}

/**
 * Express middleware rejecting requests without a verified client certificate (except health probes).
 */
export function requireClientCert(healthPaths: string[] = TLS_HEALTH_PATHS) {
  return (req: { url?: string; socket: unknown }, res: { status: (code: number) => { send: (body: unknown) => void } }, next: () => void) => {
    const path = String(req.url || '').split('?')[0];
    if (healthPaths.includes(path) || (req.socket as TLSSocket).authorized) {
      return next();
    }
    return res.status(401).send({ statusCode: 401, message: 'A valid client certificate is required' });
  };
}
