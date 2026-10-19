import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';

import { loadHttpsOptions, requireClientCert } from './tls';

function openssl(args: string[], cwd: string) {
  execFileSync('openssl', args, { cwd, stdio: 'ignore' });
}

describe('tls', () => {
  let dir: string;
  const servers: https.Server[] = [];
  const f = (n: string) => path.join(dir, n);

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-tool-tls-'));
    openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-subj', '/CN=test-ca', '-days', '2'], dir);
    fs.writeFileSync(f('ext.cnf'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
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

  async function listen(tls: Parameters<typeof loadHttpsOptions>[0]): Promise<number> {
    const options = loadHttpsOptions(tls) as NonNullable<ReturnType<typeof loadHttpsOptions>>;
    const gate = options.ca ? requireClientCert() : (_req: unknown, _res: unknown, next: () => void) => next();
    const server = https.createServer(options, (req, res) => {
      const out = {
        status: (code: number) => {
          res.statusCode = code;
          return { send: (body: unknown) => res.end(JSON.stringify(body)) };
        },
      };
      gate(req as never, out as never, () => res.end('{"ok":true}'));
    });
    servers.push(server);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    return (server.address() as AddressInfo).port;
  }

  function get(port: number, urlPath: string, extra: https.RequestOptions = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      https
        .get({ host: '127.0.0.1', port, path: urlPath, servername: 'localhost', ca: fs.readFileSync(f('ca.pem')), ...extra }, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode as number));
        })
        .on('error', reject);
    });
  }

  it('is off by default', () => {
    expect(loadHttpsOptions(undefined)).toBeUndefined();
    expect(loadHttpsOptions({ enabled: false, certPath: '/nope', keyPath: '/nope' })).toBeUndefined();
  });

  it('fails fast on unreadable or missing files', () => {
    expect(() => loadHttpsOptions({ enabled: true, certPath: f('missing.pem'), keyPath: f('server.key') })).toThrow(/certPath.*not readable/);
    expect(() => loadHttpsOptions({ enabled: true, certPath: f('server.pem'), keyPath: f('missing.key') })).toThrow(/keyPath.*not readable/);
    expect(() => loadHttpsOptions({ enabled: true, certPath: f('server.pem'), keyPath: f('server.key'), caPath: f('missing.pem') })).toThrow(
      /caPath/,
    );
    expect(() => loadHttpsOptions({ enabled: true })).toThrow(/certPath is not set/);
  });

  it('serves HTTPS when enabled', async () => {
    const port = await listen({ enabled: true, certPath: f('server.pem'), keyPath: f('server.key') });
    expect(await get(port, '/test/ping')).toBe(200);
  });

  it('with caPath requires a client cert except for the health probe', async () => {
    const port = await listen({ enabled: true, certPath: f('server.pem'), keyPath: f('server.key'), caPath: f('ca.pem') });
    expect(await get(port, '/test/ping')).toBe(200);
    expect(await get(port, '/')).toBe(401);
    expect(await get(port, '/', { cert: fs.readFileSync(f('client.pem')), key: fs.readFileSync(f('client.key')) })).toBe(200);
  });
});
