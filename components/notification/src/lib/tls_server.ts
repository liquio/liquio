import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { TLSSocket } from 'node:tls';

// Probe paths that stay reachable without a client certificate (kubelet probes cannot present one).
export const TLS_HEALTH_PATHS = ['/test/ping'];

export interface ServerTlsConfig {
  enabled?: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export interface TlsOptions {
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
    return fs.readFileSync(filePath);
  } catch (error: any) {
    throw new Error(`TLS is enabled but tls.${label} "${filePath}" is not readable: ${error.message}`);
  }
}

/**
 * Load TLS options. Returns undefined when TLS is off (default). Throws on missing/unreadable files.
 * With caPath set, client certificates are requested (mTLS); they are enforced by `requireClientCert`
 * middleware rather than at the handshake, so health probes keep working.
 */
export function loadTlsOptions(tls?: ServerTlsConfig): TlsOptions | undefined {
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
  return (req: any, res: any, next: any) => {
    const path = String(req.url || '').split('?')[0];
    const socket = req.socket as TLSSocket;
    if (healthPaths.includes(path) || socket?.authorized) {
      return next();
    }
    return res.status(401).send({ code: 'ClientCertificateRequired', message: 'A valid client certificate is required' });
  };
}

function expressLikeRes(res: http.ServerResponse): any {
  return {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    send(body: unknown) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    },
  };
}

/**
 * Create the HTTP server, or HTTPS when tls.enabled is set.
 */
export function createServer(app: any, tls?: ServerTlsConfig): http.Server | https.Server {
  const options = loadTlsOptions(tls);
  if (!options) {
    return http.createServer(app);
  }
  if (!options.ca) {
    return https.createServer(options, app);
  }
  // mTLS: gate every request (except health probes) before it reaches the express app's routes.
  const gate = requireClientCert();
  return https.createServer(options, (req, res) => gate(req, expressLikeRes(res), () => app(req, res)));
}
