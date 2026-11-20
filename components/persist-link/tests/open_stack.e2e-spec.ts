// Import.
import { TestApp, config } from './test_app';
import { StubServer } from './stub_server';

describe('OpenStack link provider', () => {
  let app: TestApp;
  let stub: StubServer;
  let base = '';
  let tokenCalls = 0;
  let failAuth = false;
  const token = 'persist-link-os-token';

  beforeAll(async () => {
    await TestApp.beforeAll();
    stub = new StubServer((req, res) => {
      const url = req.url || '';
      if (req.method === 'POST' && url === '/v2.0/tokens') {
        tokenCalls++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (failAuth) {
          return res.end('{}');
        }
        return res.end(
          JSON.stringify({
            access: {
              token: { id: `token-${tokenCalls}`, tenant: { id: 'tenant1' } },
              serviceCatalog: [{ endpoints: [{ publicURL: `${base}/v1/AUTH_tenant1` }] }],
            },
          }),
        );
      }
      if (url === '/v1/AUTH_tenant1/default/report.pdf') {
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="evil"' });
        return res.end('%PDF-fake');
      }
      res.writeHead(404);
      res.end('nope');
    });
    base = await stub.start();
    const { port } = new URL(base);
    const serverConfig = {
      name: 'os1',
      server: 'http://127.0.0.1',
      port: Number(port),
      allowInsecure: true,
      tenantName: 'tenant',
      admin: { login: 'admin', password: 'fake-admin' },
      user: { login: 'user', password: 'fake-user' },
    };
    config.link_providers.openStack = { serversList: [serverConfig], addContentDispositionHeader: true };
    config.link_providers.openStackNoHeader = { serversList: [serverConfig], addContentDispositionHeader: false };
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await stub.stop();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    failAuth = false;
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
    app = await TestApp.setup();
  });

  afterEach(async () => {
    await app.destroy();
  });

  const createHash = async (options: any) => {
    const hash = `os-${Math.random().toString(36).slice(2)}`;
    await app.request().post('/link').set('token', token).send({ type: 'openStack', options, small: true, definedHash: hash }).expect(200);
    return hash;
  };

  it('should reject invalid options', async () => {
    for (const options of [{ serverName: 'os1' }, { serverName: 5, fileName: 'a' }, { serverName: 'os1', fileName: 'a\r\nX: y' }]) {
      await app.request().post('/link').set('token', token).send({ type: 'openStack', options, small: true }).expect(400);
    }
  });

  it('should download a file with our attachment disposition and safety headers', async () => {
    const hash = await createHash({ serverName: 'os1', fileName: 'report.pdf' });

    const response = await app.request().get(`/${hash}`).expect(200);
    expect(response.headers['content-disposition']).toBe('attachment; filename=report.pdf');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(stub.requests.some((r) => r.url === '/v1/AUTH_tenant1/default/report.pdf' && r.headers['x-auth-token'] === 'token-2')).toBe(true);
  });

  it('should answer 404 for an unknown server', async () => {
    const hash = await createHash({ serverName: 'unknown', fileName: 'report.pdf' });

    await app.request().get(`/${hash}`).expect(404);
  });

  it('should answer 502 when authentication fails', async () => {
    failAuth = true;
    const hash = await createHash({ serverName: 'os1', fileName: 'report.pdf' });

    await app.request().get(`/${hash}`).expect(502);
  });
});
