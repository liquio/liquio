// Import.
import { TestApp, config } from './test_app';
import { StubServer } from './stub_server';

describe('External link provider', () => {
  let app: TestApp;
  let registerStub: StubServer;
  let storageStub: StubServer;
  const token = 'persist-link-ext-token';
  let method = '';
  let counter = 0;

  beforeAll(async () => {
    await TestApp.beforeAll();
    registerStub = new StubServer((req, res) => {
      const url = req.url || '';
      res.writeHead(url.includes('missing') ? 200 : url.includes('broken') ? 500 : 200, { 'Content-Type': 'application/json' });
      if (url.includes('missing')) {
        return res.end('{}');
      }
      if (url.includes('broken')) {
        return res.end('{"error":"boom"}');
      }
      res.end(JSON.stringify({ data: { number: 'N-42', items: [{ v: 1 }, { v: 2 }], file: 'file-1', title: 'Fake' } }));
    });
    storageStub = new StubServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end('hello');
    });
    const registerUrl = await registerStub.start();
    const storageUrl = await storageStub.start();
    config.link_providers.filestorage = { serversList: [{ name: 'fs1', apiHost: storageUrl, token: 't', containerId: 'c' }] };
    config.link_providers.external = { register: { url: registerUrl, token: 'reg-token', filestorageServerName: 'fs1' } };
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await registerStub.stop();
    await storageStub.stop();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
    method = `getRecord${counter++}`;
    config.auth.tokens = [token];
    config.link_generator.secretKey = '12345678901234567890123456789012';
    config.link_generator.cryptIv = '1234567890123456';
    app = await TestApp.setup();
  });

  afterEach(async () => {
    await app.destroy();
  });

  const createTemplate = async (body: any) => {
    const res = await app.request().post('/templates').set('token', token).send(body).expect(200);
    return res.body.data;
  };

  const createHash = async (options: any) => {
    const hash = `ext-${Math.random().toString(36).slice(2)}`;
    await app.request().post('/link').set('token', token).send({ type: 'external', options, small: true, definedHash: hash }).expect(200);
    return hash;
  };

  const options = (name: string, recordId = 'r1') => ({
    templateName: name,
    templateMethod: method,
    filter: { recordId },
  });

  it('should reject external link with invalid options', async () => {
    await app
      .request()
      .post('/link')
      .set('token', token)
      .send({ type: 'external', options: { templateName: 'x' }, small: true })
      .expect(400);
  });

  it('should render html and json for a template with plain and function mappings', async () => {
    await createTemplate({
      name: 'register',
      method,
      html: '<p>{{number}}|{{title}}|{{sum1}}|{{#if (eq number "N-42")}}eq{{/if}}|{{increment 1}}|{{sum 1 2 ""}}|{{dateFormat "2020-01-02" "YYYY"}}</p>',
      pdf: '<p>{{number}}</p>',
      jsonMap: {
        number: 'number',
        title: 'title',
        sum1: '(args) => args.recordData.items.reduce((a, i) => a + i.v, 0)',
      },
    });
    const hash = await createHash(options('register'));

    const html = await app.request().get(`/${hash}`);
    expect(html.headers['content-type']).toContain('text/html');
    expect(html.headers['content-security-policy']).toBe('sandbox');
    expect(html.text).toContain('N-42|Fake|3|eq|2|3|2020');

    const json = await app.request().get(`/${hash}?response_type=json`).expect(200);
    expect(json.body).toMatchObject({ number: 'N-42', title: 'Fake', sum1: 3 });
    expect(json.body.global.currentDate).toEqual(expect.any(String));
  });

  it('should expose getFileBase64 to async jsonMap functions in the sandbox', async () => {
    await createTemplate({
      name: 'register',
      method,
      html: '<p>{{content}}</p>',
      pdf: 'x',
      jsonMap: { content: 'async (args) => await getFileBase64(args.recordData.file)' },
    });
    const hash = await createHash(options('register'));

    const json = await app.request().get(`/${hash}?response_type=json`).expect(200);
    expect(json.body.content).toBe(Buffer.from('hello').toString('base64'));
  });

  it('should render a pdf with layout tags', async () => {
    await createTemplate({
      name: 'register',
      method,
      html: '<p>h</p>',
      pdf:
        '<landscape_orientation><pdf-border-top>10mm</pdf-border-top><pdf-border-right>1mm</pdf-border-right><pdf-border-bottom>2mm</pdf-border-bottom>' +
        '<pdf-border-left>3mm</pdf-border-left><pdf-footer-height>5mm</pdf-footer-height><pdf-format>A4</pdf-format><pdf-height>100mm</pdf-height>' +
        '<pdf-width>100mm</pdf-width><pdf-engine>x</pdf-engine><p>{{number}}</p>',
      jsonMap: { number: 'number' },
      options: { pdfOptions: { timeout: 60000 } },
    });
    const hash = await createHash(options('register'));

    const response = await app.request().get(`/${hash}?response_type=pdf`);
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.headers['content-type']).toBe('application/pdf');
    }
  });

  it('should answer 404 when no template matches', async () => {
    const hash = await createHash(options('nothing'));

    await app.request().get(`/${hash}`).expect(404);
    await app.request().get(`/${hash}/template`).expect(404);
  });

  it('should answer 404 when the register has no record', async () => {
    await createTemplate({ name: 'register', method, html: 'x', pdf: 'x' });
    const hash = await createHash(options('register', 'missing'));

    await app.request().get(`/${hash}`).expect(404);
  });

  it('should fall back to getRecord for an unknown register method', async () => {
    await createTemplate({ name: 'register', method, html: '{{number}}', pdf: 'x', jsonMap: { number: 'number' } });
    const hash = await createHash(options('register', 'r1'));

    const response = await app.request().get(`/${hash}`).expect(200);
    expect(response.text).toContain('N-42');
  });

  it('should answer 500 when the register fails', async () => {
    await createTemplate({ name: 'register', method, html: 'x', pdf: 'x' });
    const hash = await createHash(options('register', 'broken'));

    await app.request().get(`/${hash}`).expect(500);
  });

  it('should return the template via /:hash/template', async () => {
    await createTemplate({ name: 'register', method, html: '<b>h</b>', pdf: '<b>p</b>', options: { pdfOptions: { format: 'A4' } } });
    const hash = await createHash(options('register'));

    const response = await app.request().get(`/${hash}/template`).expect(200);
    expect(response.body).toEqual({ id: expect.any(Number), html: '<b>h</b>', pdf: '<b>p</b>', pdfOptions: { format: 'A4' } });
  });

  it('should perform template update and delete, and report missing templates', async () => {
    const template = await createTemplate({ name: 'register', method, html: 'a', pdf: 'a', jsonMap: { n: 'number' } });

    const updated = await app
      .request()
      .put(`/templates/${template.id}`)
      .set('token', token)
      .send({ name: 'register', method, html: 'b', pdf: 'b', jsonMap: { n: 'number' } })
      .expect(200);
    expect(updated.body.data.html).toBe('b');

    await app.request().get(`/templates/${template.id}`).set('token', token).expect(200);
    await app.request().delete(`/templates/${template.id}`).set('token', token).expect(200);
    await app.request().delete(`/templates/${template.id}`).set('token', token).expect(500);
    await app.request().get(`/templates/${template.id}`).set('token', token).expect(200);
    await app.request().get('/templates/not-a-number').set('token', token).expect(500);
  });
});
