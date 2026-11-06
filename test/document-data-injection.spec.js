const crypto = require('crypto');
const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  createCabinetApi,
  getDockerComposeLogs,
  setupLogging,
  log,
} = require('./helpers');

/*
 * Document data injection through PUT /documents/:id.
 * pdf-generator's url-guard blocks the SSRF read in CE, but the injection itself (a user-chosen
 * object key reaching the template placeholder substitution) was real. This spec pins the API
 * rejection of such keys and checks that an honest draft still produces a PDF.
 */

const WORKFLOW_TEMPLATE_ID = 900002;
const TASK_TEMPLATE_ID = 900002001;
const CABINET_URL = 'http://localhost:8081';

const POC_KEY = 'a}|$|{b';
const POC_TARGET = 'http://register:8080/test/ping';
const POC_VALUE = `SSRFA<iframe src="${POC_TARGET}"></iframe>SSRFB`;
const RADIO_1 = 'Радіокнопка 1';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

test.describe('Document data injection', () => {
  let context;
  let page;
  let api;
  let since;

  const startTask = async () => {
    const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, TASK_TEMPLATE_ID);
    expect(status, 'create task').toBe(200);
    return body.data;
  };

  const expectRejected = (response, message) => {
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.error.message).toContain(message);
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 900002 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-900002.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900002');
      await expect(adminPage).toHaveTitle(/^calcTriggers/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();
    log('✓ Workflow 900002 imported');

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

  test('rejects an object key that carries a placeholder-breaking sequence', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'ssrfread', value: { [POC_KEY]: POC_VALUE } }]),
      'Invalid property key',
    );

    const { status, body } = await api.getDocument(documentId);
    expect(status).toBe(200);
    expect(body.data.data.ssrfread).toBeUndefined();
  });

  test('rejects the caret variant and nested keys', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'ssrfread', value: { nested: [{ 'a}|^|{b': POC_VALUE }] } }]),
      'Invalid property key',
    );
  });

  test('rejects prototype path segments', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: '__proto__.polluted', value: 'x' }]),
      'Invalid property path',
    );
  });

  test('rejects paths that the template schema does not declare', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'notInSchemaStep.field', value: 'x' }]),
      'Property is not defined in the document schema',
    );
    expectRejected(
      await api.updateDocument(documentId, [{ path: 'stringSha256Info', value: { radio: RADIO_1, extra: 'x' } }]),
      'Property is not defined in the document schema',
    );
  });

  test('still generates a PDF for an honest draft', async () => {
    const { documentId } = await startTask();

    const update = await api.updateDocument(documentId, [
      { path: 'stringSha256Info.radio', value: RADIO_1 },
      { path: 'stringSha256Info.result', value: sha256(RADIO_1) },
    ]);
    expect(update.status, JSON.stringify(update.body)).toBe(200);

    const pdf = await api.createPdf(documentId);
    expect(pdf.status).toBe(200);
    expect(typeof pdf.body === 'string' && pdf.body.startsWith('%PDF')).toBe(true);
  });

  test('pdf-generator never tries to load the injected target', async () => {
    const logs = getDockerComposeLogs('pdf-generator', since);
    expect(logs).not.toMatch(/request-blocked[^\n]*register:8080/);
  });
});
