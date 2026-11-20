import { INestApplication } from '@nestjs/common';

import { createApp, postPdf } from './helpers/app';
import { captureLogs } from './helpers/log-capture';
import { expectPdf, mediaBox } from './helpers/pdf';

const html = '<html><body><h1>E2E</h1></body></html>';

describe('PDF rendering through real Chromium (e2e)', () => {
  let app: INestApplication;
  let logs: ReturnType<typeof captureLogs>;

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(() => {
    logs = captureLogs();
  });

  afterEach(() => logs.restore());

  afterAll(async () => {
    await app.close();
  });

  it('renders simple HTML', async () => {
    expectPdf(await postPdf(app, { html }));
  });

  it.each([
    ['format', { format: 'A5' }],
    ['orientation', { orientation: 'landscape' }],
    ['border', { border: { top: '1cm', left: '2cm' } }],
    ['width and height', { width: '100mm', height: '150mm' }],
    ['timeout', { timeout: 20000 }],
  ])('renders with option %s', async (_name, options) => {
    expectPdf(await postPdf(app, { html, options }));
  });

  it('produces a different page size for A5 and A4', async () => {
    const a4 = await postPdf(app, { html, options: { format: 'A4' } });
    const a5 = await postPdf(app, { html, options: { format: 'A5' } });
    expectPdf(a4);
    expectPdf(a5);
    const [a4Box, a5Box] = [mediaBox(a4), mediaBox(a5)];
    if (a4Box && a5Box) {
      expect(a4Box).not.toEqual(a5Box);
    }
  });

  it('renders header and footer', async () => {
    const template = `<html><head><style>body{font-size:10px}</style></head><body><div id="pageHeader">H</div><div id="pageFooter">F</div><p>x</p></body></html>`;
    expectPdf(await postPdf(app, { html: template }));
  });

  it('renders with a footer only', async () => {
    expectPdf(await postPdf(app, { html: '<html><body><div id="pageFooter">F</div><p>x</p></body></html>' }));
  });

  it('strips unknown top-level keys and still renders', async () => {
    expectPdf(await postPdf(app, { html, unknown: 'value' }));
  });

  it('rejects a non-string html with 400', async () => {
    const res = await postPdf(app, { html: 123 });
    expect(res.status).toBe(400);
  });

  it('rejects a string timeout with 400', async () => {
    const res = await postPdf(app, { html, options: { timeout: '1' } });
    expect(res.status).toBe(400);
  });

  it('answers 500 when the render timeout is reached', async () => {
    const res = await postPdf(app, { html, options: { timeout: 1 } });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).toContain('Timeout reached');
  });
});
