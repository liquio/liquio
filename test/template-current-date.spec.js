const { test, expect } = require('@playwright/test');

const { ensureAtLoginPage, loginWithPersonalKey, importWorkflow, createCabinetApi, extractPdfText, setupLogging, log } = require('./helpers');

/*
 * The `{{currentDate}}` helper in the document template of workflow 900006 prints the render date
 * as `DATE[DD.MM.YYYY]` and, with a format, as `ISO[YYYY-MM-DD]`. Document data cannot change it.
 */

const WORKFLOW_TEMPLATE_ID = 900006;
const TASK_TEMPLATE_ID = 900006001;

const CABINET_URL = 'http://localhost:8081';

const pad = (n) => String(n).padStart(2, '0');

// The server may use another time zone or cross midnight during the run, so accept yesterday, today and tomorrow.
const candidates = [-1, 0, 1].map((offset) => {
  const d = new Date(Date.now() + offset * 86400000);
  const [y, m, day] = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())];
  return { dotted: `${day}.${m}.${y}`, iso: `${y}-${m}-${day}` };
});
const dottedDates = candidates.map((c) => c.dotted);
const isoDates = candidates.map((c) => c.iso);

const toIso = (dotted) => dotted.split('.').reverse().join('-');

const readDates = (text) => {
  const dotted = /DATE\[(\d{2}\.\d{2}\.\d{4})\]/.exec(text)?.[1];
  const iso = /ISO\[(\d{4}-\d{2}-\d{2})\]/.exec(text)?.[1];
  expect(dotted, 'DATE line is present').toBeDefined();
  expect(iso, 'ISO line is present').toBeDefined();
  expect(dottedDates, 'DATE is a current date').toContain(dotted);
  expect(isoDates, 'ISO is a current date').toContain(iso);
  expect(toIso(dotted), 'DATE and ISO are the same day').toBe(iso);
};

test.describe('currentDate template helper', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let page;
  let api;

  const startDocument = async () => {
    const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, TASK_TEMPLATE_ID);
    expect(status, 'create task').toBe(200);
    return body.data.documentId;
  };

  const renderPdf = async (documentId) => {
    const { status, buffer } = await api.createPdf(documentId);
    expect(status, 'create pdf').toBe(200);
    return (await extractPdfText(buffer)).replace(/\s+/g, '');
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
    log('✓ Cabinet ready');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('prints the render date in the default format', async () => {
    const text = await renderPdf(await startDocument());
    const dotted = /DATE\[(\d{2}\.\d{2}\.\d{4})\]/.exec(text)?.[1];
    expect(dottedDates, 'DATE is a current date').toContain(dotted);
  });

  test('prints the render date in a custom format', async () => {
    const text = await renderPdf(await startDocument());
    const iso = /ISO\[(\d{4}-\d{2}-\d{2})\]/.exec(text)?.[1];
    expect(isoDates, 'ISO is a current date').toContain(iso);
    readDates(text);
  });

  test('ignores a currentDate key in document data', async () => {
    const documentId = await startDocument();
    const { status } = await api.updateDocument(documentId, [{ path: 'currentDate', value: '01.01.1999' }]);
    expect(status, 'update document').toBe(200);
    const text = await renderPdf(documentId);
    expect(text.includes('1999'), 'written value is not printed').toBe(false);
    readDates(text);
  });

  test('prints the date of each render', async () => {
    for (let i = 0; i < 2; i++) {
      readDates(await renderPdf(await startDocument()));
    }
  });
});
