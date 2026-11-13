import dns from 'dns';

import { INestApplication } from '@nestjs/common';
import nock from 'nock';

import { createApp, postPdf } from './helpers/app';
import { captureLogs } from './helpers/log-capture';
import { expectPdf } from './helpers/pdf';

const withFont = (url: string) =>
  `<html><head><style>@font-face { font-family: E2E; src: url('${url}') format('woff2'); }</style></head>` +
  '<body><div id="pageHeader">H</div><div id="pageFooter">F</div><p>x</p></body></html>';

describe('Remote fonts in header/footer templates (e2e)', () => {
  let app: INestApplication;
  let logs: ReturnType<typeof captureLogs>;

  beforeAll(async () => {
    app = await createApp();
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);
  });

  beforeEach(() => {
    logs = captureLogs();
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '203.0.113.20', family: 4 }] as never);
  });

  afterEach(() => {
    logs.restore();
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.enableNetConnect();
    await app.close();
  });

  it('inlines an allowed font', async () => {
    const scope = nock('http://fonts.e2e.test').get('/f.woff2').reply(200, Buffer.from('wOF2fake'), { 'content-type': 'font/woff2' });
    expectPdf(await postPdf(app, { html: withFont('http://fonts.e2e.test/f.woff2') }));
    expect(scope.isDone()).toBe(true);
    expect(logs.byType('pdf-generator|font-blocked')).toHaveLength(0);
  });

  it('blocks a font on a host that is not allowlisted', async () => {
    expectPdf(await postPdf(app, { html: withFont('http://other.e2e.test/f.woff2') }));
    expect(logs.byType('pdf-generator|font-blocked')[0].data.reason).toBe('host-not-allowed');
  });

  it('blocks an unsupported font extension', async () => {
    expectPdf(await postPdf(app, { html: withFont('http://fonts.e2e.test/f.txt') }));
    expect(logs.byType('pdf-generator|font-blocked')[0].data.reason).toBe('unsupported-format');
  });

  it('fails with 500 when the font answers 404', async () => {
    nock('http://fonts.e2e.test').get('/missing.woff2').reply(404, 'nope');
    const res = await postPdf(app, { html: withFont('http://fonts.e2e.test/missing.woff2') });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).toContain('Failed to load font');
  });

  it('fails with 500 when the font has a wrong content type', async () => {
    nock('http://fonts.e2e.test').get('/wrong.woff2').reply(200, 'html', { 'content-type': 'text/html' });
    const res = await postPdf(app, { html: withFont('http://fonts.e2e.test/wrong.woff2') });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).toContain('Failed to load font');
  });
});
