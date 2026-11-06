const fs = require('fs');
const path = require('path');
const { test, expect, request: playwrightRequest } = require('@playwright/test');

const { extractPdfText, getPdfPageSizes, getDockerComposeLogs } = require('./helpers');

/*
 * External link provider of persist-link: a template stored in persist-link is filled with a register record and rendered
 * through pdf-generator. The provider is not enabled on the default stack, so the file skips itself without
 * the compose override described in test/README.md.
 */

const PERSIST_LINK_URL = 'http://localhost:3346';
const REGISTER_URL = 'http://localhost:8103';
const CONFIG_DIR = path.resolve(__dirname, '../config');

const readToken = (service) => JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, service, 'auth.json'), 'utf8')).tokens[0];

const pad = (n) => String(n).padStart(2, '0');

// The server may use another time zone or cross midnight during the run, so accept yesterday, today and tomorrow.
const candidates = [-1, 0, 1].map((offset) => {
  const d = new Date(Date.now() + offset * 86400000);
  const [y, m, day] = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())];
  return { dotted: `${day}.${m}.${y}`, iso: `${y}-${m}-${day}` };
});

const NAME = 'Persist link render check';
const METHOD = `render-check-${Date.now()}`;
const TEMPLATE_HTML = `<html><head><meta charset="UTF-8"></head><body>
<p>TITLE[{{title}}]</p><p>MARKUP[{{markup}}]</p>
<p>DATE[{{currentDate}}]</p><p>ISO[{{currentDate 'YYYY-MM-DD'}}]</p><p>GLOBAL[{{global.currentDate}}]</p>
</body></html>`;

test.describe('persist-link external template PDF', () => {
  test.describe.configure({ mode: 'serial' });

  let persistLink;
  let register;
  let persistLinkToken;
  let registerToken;
  let registerId;
  let keyId;
  let recordId;
  let templateId;
  let hash;
  let since;
  let pdfBuffer;
  let pdfText;

  const renderWindows = [];
  const openLink = async (responseType) => {
    const start = Date.now();
    try {
      return await persistLink.get(`/link/${hash}?response_type=${responseType}`);
    } finally {
      renderWindows.push([start, Date.now()]);
    }
  };

  test.beforeAll(async () => {
    test.setTimeout(120000);

    persistLinkToken = readToken('persist-link');
    registerToken = readToken('register');
    persistLink = await playwrightRequest.newContext({ baseURL: PERSIST_LINK_URL, extraHTTPHeaders: { token: persistLinkToken } });
    register = await playwrightRequest.newContext({ baseURL: REGISTER_URL, extraHTTPHeaders: { token: registerToken } });

    // The template routes exist only when the external provider is configured.
    const probe = await persistLink.post('/templates', { data: { jsonMap: [] } });
    test.skip(probe.status() === 404, 'persist-link external provider is not enabled, see test/README.md');
    expect(probe.status(), 'external provider answers template requests').toBe(400);

    const created = async (promise, what) => {
      const response = await promise;
      expect(response.status(), what).toBe(200);
      return (await response.json()).data;
    };

    registerId = (await created(register.post('/registers', { data: { name: NAME, description: NAME } }), 'create register')).id;
    keyId = (
      await created(
        register.post('/keys', {
          data: {
            registerId,
            name: NAME,
            description: NAME,
            toString: '(record) => { return JSON.stringify(record.data); }',
            toSearchString: '(record) => { return null; }',
            schema: {
              type: 'object',
              properties: { title: { type: 'string' }, markup: { type: 'string' }, currentDate: { type: 'string' } },
            },
          },
        }),
        'create key',
      )
    ).id;
    recordId = (
      await created(
        register.post('/records', {
          data: { registerId, keyId, data: { title: METHOD, markup: '<b>bold</b>', currentDate: '01.01.1999' } },
        }),
        'create record',
      )
    ).id;

    templateId = (
      await created(
        persistLink.post('/templates', {
          data: {
            name: 'register',
            method: METHOD,
            html: TEMPLATE_HTML,
            pdf: TEMPLATE_HTML,
            jsonMap: { title: 'data.title', markup: 'data.markup', currentDate: 'data.currentDate' },
            options: { pdfOptions: { format: 'A5', phantomArgs: ['--ignore-ssl-errors=yes'], script: '/tmp/x.js' } },
          },
        }),
        'create template',
      )
    ).id;

    const link = await created(
      persistLink.post('/link', { data: { type: 'external', small: true, options: { templateName: 'register', templateMethod: METHOD, filter: { recordId } } } }),
      'create link',
    );
    const url = typeof link === 'string' ? link : link.link;
    hash = String(url).split('?')[0].split('/').filter(Boolean).pop();

    since = new Date();
    const pdf = await openLink('pdf');
    expect(pdf.status(), 'open pdf link').toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    pdfBuffer = await pdf.body();
    pdfText = await extractPdfText(pdfBuffer);
  });

  test.afterAll(async () => {
    const remove = async (client, url) => {
      if (client && url) await client.delete(url).catch(() => {});
    };
    await remove(persistLink, templateId && `/templates/${templateId}`);
    await remove(register, recordId && `/records/${recordId}`);
    await remove(register, keyId && `/keys/${keyId}`);
    await remove(register, registerId && `/registers/${registerId}`);
    await persistLink?.dispose();
    await register?.dispose();
  });

  test('renders the template to a PDF through pdf-generator', async () => {
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdfText).toContain(`TITLE[${METHOD}]`);
  });

  test('prints record data as literal text', async () => {
    expect(pdfText).toContain('MARKUP[<b>bold</b>]');
  });

  test('prints the render date with the currentDate helper', async () => {
    const text = pdfText.replace(/\s+/g, '');
    const dotted = /DATE\[(\d{2}\.\d{2}\.\d{4})\]/.exec(text)?.[1];
    const iso = /ISO\[(\d{4}-\d{2}-\d{2})\]/.exec(text)?.[1];
    expect(candidates.map((c) => c.dotted), 'DATE is a current date').toContain(dotted);
    expect(candidates.map((c) => c.iso), 'ISO is a current date').toContain(iso);
    expect(dotted.split('.').reverse().join('-'), 'DATE and ISO are the same day').toBe(iso);
    expect(text, 'mapped currentDate does not override the helper').not.toContain('1999');
  });

  test('renders global.currentDate empty', async () => {
    expect(pdfText.replace(/\s+/g, '')).toContain('GLOBAL[]');
  });

  test('applies supported PDF options and ignores the rest', async () => {
    const [size] = await getPdfPageSizes(pdfBuffer);
    expect(size.width).toBeGreaterThan(415);
    expect(size.width).toBeLessThan(425);
    expect(size.height).toBeGreaterThan(590);
    expect(size.height).toBeLessThan(600);

    const dropped = getDockerComposeLogs('persist-link', since)
      .split('\n')
      .filter((line) => line.includes('pdf-generator-options-dropped'));
    expect(dropped.length, 'dropped options are logged').toBeGreaterThan(0);
    const line = dropped.join('\n');
    expect(line).toContain('phantomArgs');
    expect(line).toContain('script');
    expect(line.includes('--ignore-ssl-errors'), 'option value in persist-link log').toBe(false);
    expect(line.includes('/tmp/x.js'), 'option value in persist-link log').toBe(false);
  });

  test('returns JSON without a global object', async () => {
    const response = await openLink('json');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('global');
    expect(body.title).toBe(METHOD);
  });

  test('does not log configuration secrets', async () => {
    const logs = getDockerComposeLogs('persist-link', since);
    const secrets = {
      'persist-link token': persistLinkToken,
      'persist-link token base64 part': persistLinkToken.split(' ').pop(),
      'register token': registerToken,
      'register token base64 part': registerToken.split(' ').pop(),
    };
    for (const [which, secret] of Object.entries(secrets)) {
      expect(logs.includes(secret), `${which} in persist-link log`).toBe(false);
    }
  });

  test('pdf-generator blocks no request while rendering', async () => {
    // Other renders (e.g. task workflows) share the pdf-generator log; only look at this spec's own render windows.
    const blocked = getDockerComposeLogs('pdf-generator', since)
      .split('\n')
      .filter((line) => line.includes('request-blocked'))
      .filter((line) => {
        const createdAt = Date.parse((line.match(/"createdAt":"([^"]+)"/) || [])[1]);
        return renderWindows.some(([start, end]) => createdAt >= start - 1000 && createdAt <= end + 1000);
      })
      .map((line) => (line.match(/"url":"([^"]+)"/) || [])[1]);
    expect(blocked, 'blocked requests during this spec renders').toEqual([]);
  });
});
