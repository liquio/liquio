import http from 'http';

import express from 'express';

import { UserIpAccessProvider } from './user_ip';

const config = {
  ip: { lists: { office: ['10.10.5.109', '10.10.6.1-5'] } },
  access: { usersIpnToIpList: { '111': ['office'] } },
};

// Runs a real Express app so `req.ip` follows the `trust proxy` setting.
async function check(trustProxy: any, xff?: string, ipn = '111'): Promise<boolean> {
  const provider = new UserIpAccessProvider(config as any);
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.get('/', async (req: any, res) => {
    req.authUserInfo = { ipn };
    res.json({ granted: await provider.checkAccess(req) });
  });
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const { port } = server.address() as any;
    return await new Promise<boolean>((resolve, reject) => {
      const headers: any = xff ? { 'x-forwarded-for': xff } : {};
      http
        .get({ host: '127.0.0.1', port, headers }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(JSON.parse(body).granted));
        })
        .on('error', reject);
    });
  } finally {
    server.close();
  }
}

describe('UserIpAccessProvider', () => {
  it('rejects a spoofed allowed IP prepended to X-Forwarded-For when one proxy hop is trusted', async () => {
    expect(await check(1, '10.10.5.109, 203.0.113.7')).toBe(false);
  });

  it('accepts the client IP appended by the trusted proxy', async () => {
    expect(await check(1, '203.0.113.7, 10.10.5.109')).toBe(true);
    expect(await check(1, '10.10.6.3')).toBe(true);
  });

  it('ignores X-Forwarded-For when no proxy is trusted', async () => {
    expect(await check(undefined, '10.10.5.109')).toBe(false);
    expect(await check(0, '10.10.5.109')).toBe(false);
  });

  it('does not restrict users without an IP list', async () => {
    expect(await check(undefined, undefined, '222')).toBe(true);
  });

  it('denies a listed user whose socket address is not allowed', async () => {
    expect(await check(undefined)).toBe(false);
  });

  it('normalises IPv4-mapped IPv6 addresses', () => {
    const provider = new UserIpAccessProvider(config as any);
    expect(provider.getRequestIp({ ip: '::ffff:10.10.5.109' })).toBe('10.10.5.109');
    expect(provider.getRequestIp({ socket: { remoteAddress: '::ffff:10.10.6.2' } })).toBe('10.10.6.2');
  });
});
