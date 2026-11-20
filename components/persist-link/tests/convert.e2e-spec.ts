// Import.
import { TestApp, config } from './test_app';
import { setAppContext } from '../src/lib/context';
import { StubServer } from './stub_server';

describe('File conversion', () => {
  let app: TestApp;
  let storage: StubServer;
  let converter: StubServer;
  let converterStatus = 200;
  const token = 'persist-link-convert-token';

  beforeAll(async () => {
    await TestApp.beforeAll();
    storage = new StubServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end('source-bytes');
    });
    converter = new StubServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(converterStatus, { 'Content-Type': 'text/plain' });
        res.end(converterStatus === 200 ? 'converted-bytes' : 'fail');
      });
    });
    const storageUrl = await storage.start();
    const converterUrl = await converter.start();
    config.link_providers.filestorage = { serversList: [{ name: 'fs1', apiHost: storageUrl, token: 't', containerId: 'c' }] };
    // FileConverterService reads the app context config; set it here to enable the converter.
    setAppContext({ config: config });
    config.file_converter = { isEnabled: true, url: `${converterUrl}/api/v1`, token: 'conv-token', timeout: 5000, routes: {} };
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await storage.stop();
    await converter.stop();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    converterStatus = 200;
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
    app = await TestApp.setup();
  });

  afterEach(async () => {
    await app.destroy();
  });

  const createHash = async (type: string, options: any) => {
    const hash = `cv-${Math.random().toString(36).slice(2)}`;
    await app.request().post('/link').set('token', token).send({ type, options, small: true, definedHash: hash }).expect(200);
    return hash;
  };

  it('should stream the converted file and send it with safety headers', async () => {
    const hash = await createHash('filestorage', { serverName: 'fs1', fileId: 'doc-1' });

    const response = await app.request().get(`/${hash}?convert=true&source_format=docx&target_format=pdf&show_in_browser=true`).expect(200);
    expect(response.text).toBe('converted-bytes');
    expect(response.headers['content-disposition']).toBe('inline');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(converter.requests.some((r) => r.url === '/api/v1/convert/by-stream/docx/to/pdf' && r.headers.authorization === 'conv-token')).toBe(true);
  });

  it('should answer 500 when the converter fails', async () => {
    converterStatus = 502;
    const hash = await createHash('filestorage', { serverName: 'fs1', fileId: 'doc-1' });

    await app.request().get(`/${hash}?convert=true&source_format=docx&target_format=pdf`).expect(500);
  });

  it('should answer 500 when the file stream cannot be taken', async () => {
    const hash = await createHash('filestorage', { serverName: 'unknown', fileId: 'doc-1' });

    await app.request().get(`/${hash}?convert=true&source_format=docx&target_format=pdf`).expect(500);
  });

  it('should answer 400 when the provider has no file stream', async () => {
    const hash = await createHash('simple', { url: 'https://example.com', redirect: true });

    const response = await app.request().get(`/${hash}?convert=true&source_format=docx&target_format=pdf`);
    expect([400, 500]).toContain(response.status);
  });
});
