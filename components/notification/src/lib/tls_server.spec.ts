import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { createServer, loadTlsOptions } from './tls_server';

function openssl(args: string[], cwd: string) {
  execFileSync('openssl', args, { cwd, stdio: 'ignore' });
}

describe('tls', () => {
  let dir: string;
  const servers: Array<http.Server | https.Server> = [];
  const app = (req: any, res: any) => res.end(JSON.stringify({ ok: true, url: req.url }));

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notification-tls-'));
    // CA, server cert (localhost) and client cert signed by that CA.
    openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-subj', '/CN=test-ca', '-days', '2'], dir);
    fs.writeFileSync(path.join(dir, 'ext.cnf'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
    for (const name of ['server', 'client']) {
      openssl(
        [
          'req',
          '-newkey',
          'rsa:2048',
          '-nodes',
          '-keyout',
          `${name}.key`,
          '-out',
          `${name}.csr`,
          '-subj',
          `/CN=${name === 'server' ? 'localhost' : 'client'}`,
        ],
        dir,
      );
      openssl(
        [
          'x509',
          '-req',
          '-in',
          `${name}.csr`,
          '-CA',
          'ca.pem',
          '-CAkey',
          'ca.key',
          '-CAcreateserial',
          '-out',
          `${name}.pem`,
          '-days',
          '2',
          '-extfile',
          'ext.cnf',
        ],
        dir,
      );
    }
  });

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(() => r(undefined)))));
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const f = (n: string) => path.join(dir, n);

  async function listen(server: http.Server | https.Server): Promise<number> {
    servers.push(server);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    return (server.address() as AddressInfo).port;
  }

  function get(port: number, urlPath: string, extra: https.RequestOptions = {}): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      https
        .get({ host: '127.0.0.1', port, path: urlPath, servername: 'localhost', ca: fs.readFileSync(f('ca.pem')), ...extra }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode as number, body }));
        })
        .on('error', reject);
    });
  }

  it('is off by default and serves plain HTTP', async () => {
    expect(loadTlsOptions(undefined)).toBeUndefined();
    expect(loadTlsOptions({ enabled: false, certPath: '/nope', keyPath: '/nope' })).toBeUndefined();
    const server = createServer(app, undefined);
    expect(server).toBeInstanceOf(http.Server);
    expect(server).not.toBeInstanceOf(https.Server);
  });

  it('fails fast on unreadable or missing files', () => {
    expect(() => loadTlsOptions({ enabled: true, certPath: f('missing.pem'), keyPath: f('server.key') })).toThrow(/certPath.*not readable/);
    expect(() => loadTlsOptions({ enabled: true, certPath: f('server.pem'), keyPath: f('missing.key') })).toThrow(/keyPath.*not readable/);
    expect(() => loadTlsOptions({ enabled: true, certPath: f('server.pem'), keyPath: f('server.key'), caPath: f('missing.pem') })).toThrow(/caPath/);
    expect(() => loadTlsOptions({ enabled: true })).toThrow(/certPath is not set/);
  });

  it('serves HTTPS when enabled', async () => {
    const port = await listen(createServer(app, { enabled: true, certPath: f('server.pem'), keyPath: f('server.key') }));
    const res = await get(port, '/test/ping');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, url: '/test/ping' });
  });

  it('with caPath requires a client cert except for the health probe', async () => {
    const port = await listen(createServer(app, { enabled: true, certPath: f('server.pem'), keyPath: f('server.key'), caPath: f('ca.pem') }));
    expect((await get(port, '/test/ping')).status).toBe(200);
    expect((await get(port, '/message')).status).toBe(401);
    const withCert = await get(port, '/message', { cert: fs.readFileSync(f('client.pem')), key: fs.readFileSync(f('client.key')) });
    expect(withCert.status).toBe(200);
  });
});
