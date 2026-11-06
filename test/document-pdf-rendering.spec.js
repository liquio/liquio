const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  createCabinetApi,
  getDockerComposeLogs,
  extractPdfText,
  getPdfPageSizes,
  setupLogging,
  log,
} = require('./helpers');

/*
 * PDF rendering of document data (workflow 900006). The document template prints data with
 * `{{ }}` (escaped), a single-brace placeholder and the `publicUrl` config variable.
 * Every case writes data to a new document, renders the PDF through cabinet-api and checks the
 * text of the PDF. Text has no whitespace; markers are ASCII, e.g. `NAME[...]`.
 */

const WORKFLOW_TEMPLATE_ID = 900006;
const TASK_TEMPLATE_ID = 900006001;

const CABINET_URL = 'http://localhost:8081';

const { variables } = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/task/file_generator.json'), 'utf8'));

const marker = () => `m${crypto.randomUUID().replace(/-/g, '')}`;

test.describe('Document PDF rendering', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let page;
  let api;
  let since;

  const startDocument = async () => {
    const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, TASK_TEMPLATE_ID);
    expect(status, 'create task').toBe(200);
    return body.data.documentId;
  };

  const write = async (documentId, properties) => {
    const { status } = await api.updateDocument(documentId, properties);
    expect(status, 'update document').toBe(200);
  };

  const renderPdf = async (documentId) => {
    const { status, buffer } = await api.createPdf(documentId);
    expect(status, 'create pdf').toBe(200);
    expect(buffer.subarray(0, 4).toString(), 'response is a PDF').toBe('%PDF');
    // Long values wrap in the PDF, so all whitespace is dropped and expected strings have none.
    return { buffer, text: (await extractPdfText(buffer)).replace(/\s+/g, '') };
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 900006 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-900006.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900006');
      await expect(adminPage).toHaveTitle(/^PDF rendering/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();
    log('✓ Workflow 900006 imported');

    log('Logging in to cabinet as demo user');
    context = await browser.newContext();
    page = await context.newPage();
    await setupLogging(page);
    page.setDefaultTimeout(15000);
    await page.goto(`${CABINET_URL}/`);
    await page.waitForLoadState('networkidle');
    // The redirect to the login page can come after the network is idle, so wait for either outcome.
    await page.waitForFunction(() => globalThis.location.port === '8080' || !!localStorage.getItem('token'), null, { timeout: 30000 });
    if (page.url().includes('localhost:8080')) {
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/demo.p12', 'demo');
    }
    await expect(page).toHaveURL(/^http:\/\/localhost:8081/);
    api = await createCabinetApi(page);
    since = new Date();
    log('✓ Cabinet ready');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('prints markup in document data as literal text', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{ path: 'profile.fullName', value: `<b>${m}</b><script>document.title='x'</script>` }]);
    const { text } = await renderPdf(documentId);
    expect(text.includes(`NAME[<b>${m}</b>`), 'NAME line shows the tags literally').toBe(true);
  });

  test('does not let document data add PDF option tags', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{ path: 'profile.note', value: `<landscape_orientation></landscape_orientation><pdf-format>A3</pdf-format>${m}` }]);
    const { buffer, text } = await renderPdf(documentId);
    const sizes = await getPdfPageSizes(buffer);
    expect(sizes.length, 'PDF has pages').toBeGreaterThan(0);
    for (const { width, height } of sizes) {
      expect(height > width, 'page is portrait').toBe(true);
      expect(width, 'page is not A3').toBeLessThan(700);
    }
    expect(text.includes('<landscape_orientation>'), 'orientation tag is printed').toBe(true);
    expect(text.includes(`<pdf-format>A3</pdf-format>${m}`), 'format tag is printed').toBe(true);
  });

  test('does not let document data split the PDF with a delimiter', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{ path: 'profile.note', value: `before<pdf-delimiter>() => false</pdf-delimiter>after${m}` }]);
    const { text } = await renderPdf(documentId);
    expect(text.includes(`after${m}`), 'text after the delimiter is kept').toBe(true);
    expect(text.includes('<pdf-delimiter>'), 'delimiter is printed').toBe(true);
  });

  test('renders a single-brace placeholder in a template literally', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{ path: 'profile.fullName', value: m }]);
    const { text } = await renderPdf(documentId);
    expect(text.includes('LEGACY[{profile.fullName}]'), 'single-brace placeholder is kept').toBe(true);
    expect(text.includes(`NAME[${m}]`), 'double-brace value is printed').toBe(true);
    expect(text.split(m).length - 1, 'value is printed once').toBe(1);
  });

  test('uses the config value when document data has a key with the same name', async () => {
    const expected = variables.publicUrl;
    const documentId = await startDocument();
    await write(documentId, [{ path: 'publicUrl', value: 'http://spoofed.example.invalid/' }]);
    const { text } = await renderPdf(documentId);
    expect(text.includes(`URL[${expected}]`), 'URL line shows the config value').toBe(true);
    expect(text.includes('spoofed.example.invalid'), 'data value is not printed').toBe(false);
  });

  test('renders array items from document data', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{ path: 'profile.items', value: [{ name: `${m}-1` }, { name: `<i>${m}-2</i>` }] }]);
    const { text } = await renderPdf(documentId);
    expect(text.includes(`ITEM[${m}-1]`), 'first item is printed').toBe(true);
    expect(text.includes(`ITEM[<i>${m}-2</i>]`), 'second item shows the tags literally').toBe(true);
  });

  test('pdf-generator never requests a URL that only appears in document data', async () => {
    const m = marker();
    const documentId = await startDocument();
    await write(documentId, [{
      path: 'profile.note',
      value: `<img src="http://${m}.example.invalid/a.png"><iframe src="http://register:8080/test/ping?${m}"></iframe>`,
    }]);
    await renderPdf(documentId);
    const logs = getDockerComposeLogs('pdf-generator', since);
    const blocked = logs.split('\n').filter((line) => line.includes('request-blocked') && line.includes(m));
    expect(blocked.length, 'no blocked request mentions the data URL').toBe(0);
  });
});
