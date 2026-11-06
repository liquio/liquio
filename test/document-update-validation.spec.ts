import * as crypto from 'crypto';
import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

import {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  createCabinetApi,
  getDockerComposeLogs,
  extractPdfText,
  setupLogging,
  log,
} from './helpers';
import type { CabinetApi, CabinetApiResponse } from './helpers';

/*
 * PUT /documents/:id validation of written data:
 *   - object keys with template or markup metacharacters and prototype names are rejected,
 *   - prototype path segments are rejected,
 *   - paths and keys the template schema does not declare are rejected,
 *   - a valid draft still produces a PDF, and pdf-generator never requests a URL that only
 *     appeared in rejected data.
 */

const WORKFLOW_TEMPLATE_ID = 900002;
const TASK_TEMPLATE_ID = 900002001;
const CABINET_URL = 'http://localhost:8081';

const BRACE_KEY = 'a}|$|{b';
const CARET_KEY = 'a}|^|{b';
const EXTERNAL_TARGET = 'http://register:8080/test/ping';
const MARKUP_VALUE = `<iframe src="${EXTERNAL_TARGET}"></iframe>`;
const RADIO_1 = 'Радіокнопка 1';

const sha256 = (value: unknown) => crypto.createHash('sha256').update(String(value)).digest('hex');

test.describe('Document update validation', () => {
  let context: BrowserContext;
  let page: Page;
  let api: CabinetApi;
  let since: Date;

  const startTask = async () => {
    const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, TASK_TEMPLATE_ID);
    expect(status, 'create task').toBe(200);
    return body.data;
  };

  const expectRejected = (response: CabinetApiResponse, message: string) => {
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

  test('rejects an object key with brace and pipe characters', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'unknownStep', value: { [BRACE_KEY]: MARKUP_VALUE } }]),
      'Invalid property key',
    );

    const { status, body } = await api.getDocument(documentId);
    expect(status).toBe(200);
    expect(body.data.data.unknownStep).toBeUndefined();
  });

  test('rejects a caret key nested in an array item', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'unknownStep', value: { nested: [{ [CARET_KEY]: MARKUP_VALUE }] } }]),
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

  test('still generates a PDF for a valid draft', async () => {
    const { documentId } = await startTask();

    const update = await api.updateDocument(documentId, [
      { path: 'stringSha256Info.radio', value: RADIO_1 },
      { path: 'stringSha256Info.result', value: sha256(RADIO_1) },
    ]);
    expect(update.status, JSON.stringify(update.body)).toBe(200);

    const pdf = await api.createPdf(documentId);
    expect(pdf.status).toBe(200);
    expect(pdf.buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect((await extractPdfText(pdf.buffer)).length).toBeGreaterThan(0);
  });

  test('pdf-generator never requests a URL from rejected document data', async () => {
    const logs = getDockerComposeLogs('pdf-generator', since);
    expect(logs).not.toMatch(/request-blocked[^\n]*register:8080/);
  });
});

test.describe('Document update schema allow-list', () => {
  const SCHEMA_MESSAGE = 'Property is not defined in the document schema';

  let context: BrowserContext;
  let page: Page;
  let api: CabinetApi;
  let since: Date;

  const startTask = async () => {
    const { status, body } = await api.createTask(900006, 900006001);
    expect(status, 'create task').toBe(200);
    return body.data;
  };

  const expectRejected = (response: CabinetApiResponse, message: string) => {
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.error.message).toContain(message);
  };

  const expectAccepted = (response: CabinetApiResponse) => {
    expect(response.status, JSON.stringify(response.body)).toBe(200);
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

  test('accepts a declared field inside an array item', async () => {
    const { documentId } = await startTask();

    expectAccepted(await api.updateDocument(documentId, [{ path: 'profile.items', value: [{ name: 'a' }] }]));
    expectAccepted(await api.updateDocument(documentId, [{ path: 'profile.items.0.name', value: 'b' }]));

    const { status, body } = await api.getDocument(documentId);
    expect(status).toBe(200);
    expect(body.data.data.profile.items[0].name).toBe('b');
  });

  test('rejects an undeclared key inside an array item', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'profile.items', value: [{ name: 'a', extra: 'x' }] }]),
      SCHEMA_MESSAGE,
    );

    const { body } = await api.getDocument(documentId);
    expect(body.data.data.profile?.items).toBeUndefined();
  });

  test('rejects a non-numeric array segment', async () => {
    const { documentId } = await startTask();

    expectRejected(await api.updateDocument(documentId, [{ path: 'profile.items.first.name', value: 'x' }]), SCHEMA_MESSAGE);
  });

  test('accepts any content below a free-form field', async () => {
    const { documentId } = await startTask();

    expectAccepted(await api.updateDocument(documentId, [
      { path: 'freeForm', value: { any: { deep: [{ x: 1 }] }, other: 'y' } },
    ]));
    expectAccepted(await api.updateDocument(documentId, [{ path: 'freeForm.any.added', value: 'z' }]));

    const { body } = await api.getDocument(documentId);
    expect(body.data.data.freeForm.any.deep).toEqual([{ x: 1 }]);
    expect(body.data.data.freeForm.any.added).toBe('z');
    expect(body.data.data.freeForm.other).toBe('y');
  });

  test('still rejects unsafe keys below a free-form field', async () => {
    const { documentId } = await startTask();

    expectRejected(await api.updateDocument(documentId, [{ path: 'freeForm', value: { 'a<b': 1 } }]), 'Invalid property key');
    expectRejected(
      await api.updateDocument(documentId, [{ path: 'freeForm', value: { nested: { constructor: 1 } } }]),
      'Invalid property key',
    );
  });

  test('accepts undeclared keys where the schema allows additional properties', async () => {
    const { documentId } = await startTask();

    expectAccepted(await api.updateDocument(documentId, [{ path: 'profile.meta', value: { known: 'k', custom: 'c' } }]));
  });

  test('accepts the propertiesHasOptions key in a closed step', async () => {
    const { documentId } = await startTask();

    expectAccepted(await api.updateDocument(documentId, [{ path: 'profile.propertiesHasOptions', value: { fullName: true } }]));
  });

  test('checks the trigger path before the schema', async () => {
    const { documentId } = await startTask();

    const response = await api.updateDocument(documentId, [{ path: 'notInSchema.field', value: 'x' }], ['profile.a b']);
    expectRejected(response, 'Invalid trigger path');
    expect(response.body.error.message).not.toContain(SCHEMA_MESSAGE);
  });

  test('rejects prototype segments in the trigger path', async () => {
    const { documentId } = await startTask();

    expectRejected(
      await api.updateDocument(documentId, [{ path: 'profile.fullName', value: 'x' }], ['__proto__.polluted']),
      'Invalid trigger path',
    );
    expectRejected(
      await api.updateDocument(documentId, [{ path: 'profile.fullName', value: 'x' }], ['profile.constructor']),
      'Invalid trigger path',
    );
  });

  test('does not echo rejected values in the response or the task log', async () => {
    const { documentId } = await startTask();
    const marker = `v${crypto.randomUUID().replace(/-/g, '')}`;

    const undeclared = await api.updateDocument(documentId, [{ path: 'profile', value: { fullName: 'ok', undeclared: marker } }]);
    expectRejected(undeclared, SCHEMA_MESSAGE);
    expect(JSON.stringify(undeclared.body).includes(marker), 'rejected value in response').toBe(false);

    const unsafeKey = await api.updateDocument(documentId, [{ path: 'freeForm', value: { 'a}b': marker } }]);
    expectRejected(unsafeKey, 'Invalid property key');
    expect(JSON.stringify(unsafeKey.body).includes(marker), 'rejected value in response').toBe(false);

    const logs = getDockerComposeLogs('task', since);
    expect(logs.includes(marker), 'rejected value in task log').toBe(false);
  });
});
