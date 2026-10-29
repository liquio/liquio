// Import.
import { TestApp, config } from './test_app';
import { StubServer } from './stub_server';

describe('Filestorage link provider', () => {
  let app: TestApp;
  let stub: StubServer;
  const token = 'persist-link-fs-token';
  const pdfBytes = Buffer.from('%PDF-1.4 fake');

  beforeAll(async () => {
    await TestApp.beforeAll();
    stub = new StubServer((req, res) => {
      const url = req.url || '';
      if (url.startsWith('/files/boom')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end('{"error":"boom"}');
      }
      if (url.startsWith('/files/html-file')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': 'inline; filename="a.html"' });
        return res.end('<script>alert(1)</script>');
      }
      if (url.startsWith('/files/pdf-file')) {
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="a.pdf"' });
        return res.end(pdfBytes);
      }
      if (url.startsWith('/files/p7s-file')) {
        res.writeHead(200, { 'Content-Type': 'application/pkcs7-signature' });
        return res.end('p7s');
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{"error":"not found"}');
    });
    const apiHost = await stub.start();
    config.link_providers.filestorage = {
      serversList: [{ name: 'fs1', apiHost, token: 'downstream-token', containerId: 'c1' }],
      addContentDispositionHeader: true,
    };
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
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
    app = await TestApp.setup();
  });

  afterEach(async () => {
    await app.destroy();
  });

  const create = (options: any, extra: any = {}) =>
    app
      .request()
      .post('/link')
      .set('token', token)
      .send({ type: 'filestorage', options, small: true, definedHash: `fs-${Math.random().toString(36).slice(2)}`, ...extra });

  const createHash = async (options: any) => {
    const hash = `fs-${Math.random().toString(36).slice(2)}`;
    await app.request().post('/link').set('token', token).send({ type: 'filestorage', options, small: true, definedHash: hash }).expect(200);
    return hash;
  };

  it('should reject filestorage link with invalid options', async () => {
    await create({ serverName: 'fs1' }).expect(400);
    await create({ serverName: 1, fileId: 'x' }).expect(400);
  });

  it('should stream an allowed file with safety headers and forward the downstream token', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'pdf-file' });

    const response = await app.request().get(`/${hash}`).expect(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toMatch(/^attachment/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(Buffer.from(response.body).toString()).toBe(pdfBytes.toString());
    expect(stub.requests.some((r) => r.url === '/files/pdf-file' && r.headers.token === 'downstream-token')).toBe(true);
  });

  it('should show an allowed file inline when show_in_browser is set', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'pdf-file' });

    const response = await app.request().get(`/${hash}?show_in_browser=true`).expect(200);
    expect(response.headers['content-disposition']).toMatch(/^inline/);
  });

  it('should never render a non-allowlisted content type inline', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'html-file' });

    const response = await app.request().get(`/${hash}?show_in_browser=true`).expect(200);
    expect(response.headers['content-disposition']).toMatch(/^attachment/);
  });

  it('should request the p7s endpoint when isP7s is set', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'p7s-file', isP7s: true });

    await app.request().get(`/${hash}`).expect(200);
    expect(stub.requests.some((r) => r.url === '/files/p7s-file/p7s?as_file=true')).toBe(true);
  });

  it('should answer 404 for an unknown filestorage server', async () => {
    const hash = await createHash({ serverName: 'unknown', fileId: 'pdf-file' });

    await app.request().get(`/${hash}`).expect(404);
  });

  it('should pass the downstream error status through', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'boom' });

    const response = await app.request().get(`/${hash}`);
    expect(response.status).toBeGreaterThanOrEqual(500);
  });

  it('should answer 404 for an unknown hash or malformed link', async () => {
    const response = await app.request().get('/does-not-exist');
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should require source and target formats to convert', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'pdf-file' });

    await app.request().get(`/${hash}?convert=true`).expect(400);
  });

  it('should fail conversion when the converter is disabled', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'pdf-file' });

    const response = await app.request().get(`/${hash}?convert=true&source_format=docx&target_format=pdf`);
    expect(response.status).toBe(500);
  });

  it('should return a provider error for /:hash/template', async () => {
    const hash = await createHash({ serverName: 'fs1', fileId: 'pdf-file' });

    const response = await app.request().get(`/${hash}/template`);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
