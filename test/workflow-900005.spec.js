const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  createCabinetApi,
  setupLogging,
  log,
} = require('./helpers');

/*
 * "Text and numbers" form controls on a single step (`textNumbers`) of workflow 900005:
 *   textValue    string           required, minLength 3, maxLength 50
 *   numberValue  number           required, toFixed 2, 1..1000
 *   integerValue integer          required, 1..100
 *   phone        phone            required, ua only, checkValid: 12 digits
 *   amount       currency.input   required, UAH, 0.01..1000000
 *   agree        toggle           -
 *
 * textArea and address are left out: textArea blanks the form on React 19 (react-quill calls
 * findDOMNode), and address needs the ATU register, which the default stack does not have.
 *
 * The UI tests go through one task: finish an empty form, finish with invalid values, then fill
 * valid values, finish and check the document. Client validation only runs on "Finish".
 * The server tests drive the cabinet API on a separate task: PUT /documents/:id stores anything,
 * POST /documents/:id/validate has to reject it.
 */

const WORKFLOW_TEMPLATE_ID = 900005;
const TASK_TEMPLATE_ID = 900005001;
const STEP = 'textNumbers';

const CABINET_URL = 'http://localhost:8081';

const VALID = {
  textValue: 'Valid text value',
  numberValue: 123.45,
  integerValue: 42,
  phone: '380961234567',
  amount: 1234.5,
  agree: true,
};

test.describe('Workflow 900005 (Text and numbers controls)', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let page;
  let api;
  let taskId;

  const fields = () => ({
    textValue: page.getByLabel('Text value'),
    numberValue: page.locator('#numberValue'),
    integerValue: page.getByLabel('Integer value'),
    phone: page.getByRole('textbox', { name: 'Enter phone number' }),
    amount: page.getByRole('textbox', { name: 'UAH' }),
    agree: page.locator('#agree'),
  });

  // Each field has its own top-level wrapper on the step; the error is its MUI helper text
  // (a <p> for string and integer, a <div> for the others).
  const errorFor = (locator) => locator.evaluate((input) => {
    const helper = input.closest('main > div')?.querySelector('.MuiFormHelperText-root.Mui-error');
    return helper ? helper.innerText.split('\n')[0].trim() : null;
  });

  // Clicks "Finish" and checks that the document was not committed.
  const finishExpectingErrors = async () => {
    const commits = [];
    const onRequest = (request) => {
      if (/\/documents\/[^/]+\/validate\?commit=true/.test(request.url())) commits.push(request.url());
    };
    page.on('request', onRequest);
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.locator('.MuiFormHelperText-root.Mui-error').first()).toBeVisible();
    await page.waitForTimeout(1000);
    page.off('request', onRequest);
    expect(commits, 'Finish must not commit an invalid document').toEqual([]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 900005 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-900005.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900005');
      await expect(adminPage).toHaveTitle(/^Text and numbers controls/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();
    log('✓ Workflow 900005 imported');

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

  test.describe('cabinet UI', () => {
    test('starts the process on the textNumbers step', async () => {
      await page.goto(`${CABINET_URL}/tasks/create/${WORKFLOW_TEMPLATE_ID}/${TASK_TEMPLATE_ID}`);
      await page.waitForURL(new RegExp(`/tasks/[0-9a-f-]{36}/${STEP}`), { timeout: 30000 });
      taskId = page.url().match(/\/tasks\/([0-9a-f-]{36})\//)[1];
      log(`Task ${taskId} started`);

      const { textValue, numberValue, integerValue, phone, amount, agree } = fields();
      await expect(textValue).toBeVisible();
      await expect(numberValue).toBeVisible();
      await expect(integerValue).toBeVisible();
      await expect(phone).toHaveValue('+380');
      await expect(amount).toBeVisible();
      await expect(agree).not.toBeChecked();
    });

    test('shows required errors when finishing an empty form', async () => {
      await finishExpectingErrors();

      const { textValue, numberValue, integerValue, phone, amount } = fields();
      expect(await errorFor(textValue)).toBe('Required field');
      // Required number and integer fields are filled with 0, so they fail on minimum instead.
      expect(await errorFor(numberValue)).toBe('Must be >= 1');
      expect(await errorFor(integerValue)).toBe('Must be >= 1');
      expect(await errorFor(phone)).toBe('Required field');
      expect(await errorFor(amount)).toBe('Required field');
    });

    test('caps text input at maxLength', async () => {
      const { textValue } = fields();
      await textValue.fill('');
      await textValue.pressSequentially('x'.repeat(60));
      await expect(textValue).toHaveValue('x'.repeat(50));
    });

    test('shows validation errors when finishing with invalid values', async () => {
      const { textValue, numberValue, integerValue, phone, amount } = fields();
      await textValue.fill('ab');
      await numberValue.fill('5000');
      await integerValue.fill('0');
      await phone.click();
      await phone.press('End');
      await phone.pressSequentially('9612');
      await amount.click();
      await amount.pressSequentially('2000000');
      await textValue.click();
      await page.waitForLoadState('networkidle');

      await finishExpectingErrors();
      // Errors from the previous attempt stay until validation reruns.
      await expect.poll(() => errorFor(textValue)).toBe('Must be at least 3 characters');
      expect(await errorFor(numberValue)).toBe('Must be <= 1000');
      expect(await errorFor(integerValue)).toBe('Must be >= 1');
      expect(await errorFor(phone)).toBe('Phone must have 12 digits');
      expect(await errorFor(amount)).toBe('Must be <= 1000000');
    });

    test('finishes with valid values and saves them to the document', async () => {
      const { textValue, numberValue, integerValue, phone, amount, agree } = fields();
      await textValue.fill(VALID.textValue);
      await numberValue.fill('123.45');
      await integerValue.fill('42');
      // The +380 prefix is not editable: clear what the previous test typed, then type the rest.
      await phone.click();
      await phone.press('End');
      for (let i = 0; i < 15; i++) await phone.press('Backspace');
      await phone.pressSequentially('961234567');
      await amount.click();
      await amount.press('ControlOrMeta+a');
      await amount.press('Backspace');
      await amount.pressSequentially('1234.5');
      await agree.click();
      await textValue.click();

      await expect(phone).toHaveValue('+380 (96) 123 45 67');
      await expect(amount).toHaveValue('1 234.50');
      await expect(agree).toBeChecked();
      // Let the debounced document updates go out.
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const committed = page.waitForResponse((response) => /\/documents\/[^/]+\/validate\?commit=true/.test(response.url()));
      await page.getByRole('button', { name: 'Finish' }).click();
      expect((await committed).status()).toBe(200);
      await expect(page.getByRole('dialog')).toContainText(/Thank you|application has been sent/);

      const task = await api.getTask(taskId);
      expect(task.status).toBe(200);
      expect(task.body.data.finished).toBe(true);

      const document = await api.getDocument(task.body.data.documentId);
      expect(document.status).toBe(200);
      expect(document.body.data.isFinal).toBe(true);
      expect(document.body.data.data[STEP]).toEqual(VALID);
    });
  });

  test.describe('server-side validation', () => {
    let documentId;
    let apiTaskId;

    const put = (values) => api.updateDocument(
      documentId,
      Object.entries(values).map(([key, value]) => ({ path: `${STEP}.${key}`, value })),
    );
    const details = (response) => (response.body?.error?.details || []).map((detail) => `${detail.dataPath} | ${detail.message}`);

    test.beforeAll(async () => {
      const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, TASK_TEMPLATE_ID);
      expect(status).toBe(200);
      apiTaskId = body.data.id;
      documentId = body.data.documentId;
    });

    test('rejects an empty document with checkRequired errors', async () => {
      const response = await api.validateDocument(documentId);
      expect(response.status).not.toBe(200);
      expect(response.body.error.message).toBe('Error: Validation error.');
      expect(details(response)).toEqual(expect.arrayContaining(
        ['textValue', 'numberValue', 'integerValue', 'phone', 'amount'].map((field) => `${STEP}.${field} | checkRequired error.`),
      ));
    });

    test('accepts valid values', async () => {
      expect((await put(VALID)).status).toBe(200);
      const response = await api.validateDocument(documentId);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      expect(response.body.data).toBe(true);
    });

    // One invalid field at a time: Ajv reports only the first schema error.
    const INVALID = [
      ['textValue', 'ab', 'should NOT be shorter than 3 characters'],
      ['textValue', 'x'.repeat(51), 'should NOT be longer than 50 characters'],
      ['textValue', 123, 'should be string'],
      ['numberValue', 'abc', 'should be number'],
      ['numberValue', 0, 'should be >= 1'],
      ['numberValue', 1001, 'should be <= 1000'],
      ['integerValue', 1.5, 'should be integer'],
      ['integerValue', 101, 'should be <= 100'],
      ['phone', '38096', 'checkValid error (Phone must have 12 digits).'],
      ['amount', 0, 'should be >= 0.01'],
      ['amount', 1000001, 'should be <= 1000000'],
      ['agree', 'yes', 'should be boolean'],
    ];

    for (const [field, value, message] of INVALID) {
      test(`rejects ${field} = ${JSON.stringify(value).slice(0, 20)}`, async () => {
        // PUT stores the value as is; only /validate checks it.
        expect((await put({ [field]: value })).status).toBe(200);
        try {
          const response = await api.validateDocument(documentId);
          expect(response.status).not.toBe(200);
          expect(details(response)).toContain(`${STEP}.${field} | ${message}`);
        } finally {
          await put({ [field]: VALID[field] });
        }
      });
    }

    test('does not finish the task when committing invalid data', async () => {
      expect((await put({ numberValue: 5000 })).status).toBe(200);
      const response = await api.validateDocument(documentId, { commit: true });
      expect(response.status).not.toBe(200);
      expect(details(response)).toContain(`${STEP}.numberValue | should be <= 1000`);

      const task = await api.getTask(apiTaskId);
      expect(task.body.data.finished).toBe(false);
    });
  });
});
