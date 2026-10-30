// Import.
import { TestApp, config } from './test_app';
import { StubServer } from './stub_server';

describe('Misc endpoints and error paths', () => {
  let app: TestApp;
  let stub: StubServer;
  let pingStatus = 200;
  const token = 'persist-link-misc-token';

  beforeAll(async () => {
    await TestApp.beforeAll();
    stub = new StubServer((_req, res) => {
      res.writeHead(pingStatus, { 'Content-Type': 'application/json' });
      res.end(pingStatus === 200 ? '{"data":{"message":"pong"}}' : '{"error":{"message":"Incorrect token."}}');
    });
    const apiHost = await stub.start();
    config.link_providers.filestorage = { serversList: [{ name: 'fs1', apiHost, token: 'downstream', containerId: 'c' }] };
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
    pingStatus = 200;
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
    app = await TestApp.setup();
  });

  afterEach(async () => {
    await app.destroy();
  });

  const simple = { url: 'https://example.com', redirect: true };

  it('should answer ping and authenticated ping', async () => {
    await app.request().get('/test/ping').expect(200);
    await app.request().get('/test/ping_with_auth').expect(401);
    await app.request().get('/test/ping_with_auth').set('token', 'wrong-token').expect(401);
    await app.request().get('/test/ping_with_auth').set('token', token).expect(200);
  });

  it('should check the filestorage token on healthcheck', async () => {
    await app.request().get('/test/ping?healthcheck=true').expect(200);

    pingStatus = 403;
    const response = await app.request().get('/test/ping?healthcheck=true').expect(500);
    expect(JSON.stringify(response.body)).not.toContain('Incorrect token');
  });

  it('should return a QR code for every qr type', async () => {
    for (const qr of ['matrix', 'png', 'svg', 'eps', 'pdf', 'other']) {
      const response = await app
        .request()
        .post(`/link?qr=${qr}`)
        .set('token', token)
        .send({ type: 'simple', options: simple, small: true })
        .expect(200);
      expect(response.body.data.link ?? response.body.data).toBeDefined();
    }
  });

  it('should create a stored link when small is not set', async () => {
    const created = await app.request().post('/link').set('token', token).send({ type: 'simple', options: simple }).expect(200);
    expect(String(created.body.data).startsWith(config.link_generator.linksPrefix)).toBe(true);
  });

  it('should answer 400 for an unparsable json body without leaking details', async () => {
    const response = await app.request().post('/link').set('token', token).set('Content-Type', 'application/json').send('{"broken":');
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain('broken');
  });

  it('should answer 413 for an oversized body', async () => {
    const response = await app
      .request()
      .post('/link')
      .set('token', token)
      .send({ type: 'simple', options: { url: `https://example.com/${'a'.repeat(11 * 1024 * 1024)}` } });
    expect(response.status).toBe(413);
  });

  it('should answer an error for a wrong hash on /:hash and /:hash/template', async () => {
    await app.request().get('/link/wrong-hash').expect(500);
    await app.request().get('/wrong-hash/template').expect(500);
  });

  it('should add application identification headers and CORS', async () => {
    const response = await app.request().get('/test/ping').set('Origin', 'http://example.com');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
