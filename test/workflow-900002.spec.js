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
 * Server-side calcTriggers validation (`validate: true`) and `triggerPath` on PUT /documents/:id.
 *
 * The fixture is the QA workflow from the task with one entry task per visibility case:
 *   1.1 source + checkStepHidden   1.2 source + stepOrders
 *   2.1 step + checkStepHidden     2.2 step + stepOrders
 *   3.1 callBeforePdf + pdfRequired: true   3.2 callBeforePdf + pdfRequired function
 *   4.1 silent + checkStepHidden   4.2 silent + stepOrders
 * Only 1.1 had `validate: true` in the original export; the fixture adds it to the triggers of
 * 1.2-4.2 so the rules are exercised. The step trigger that fills `indexInfo.resultArray` stays
 * unchecked, as in the original export (`validate: false` in 1.1, no flag in 1.2): the user adds
 * fields to its items, so the stored array never equals the recalculated one.
 *
 * The UI never sends a tampered value, so the cases drive the cabinet API directly as the
 * logged-in user - which is exactly what an attacker with devtools would do.
 *
 * Expected results describe the intended server-side validation behaviour.
 *
 * Honest user in the UI (`honest user in the UI` block):
 * Server-side calcTriggers validation (`validate: true`) seen by an honest user.
 * Every entry task of the QA workflow is filled through the cabinet UI the way a real user does it
 * (radio buttons, dates, Continue, Finish). The front calculates the triggers and saves the results,
 * the server recalculates them on /validate and commit. An honest user must never get a calcTrigger
 * mismatch, and the task must end up finished.
 *   1.1 source + checkStepHidden   1.2 source + stepOrders
 *   2.1 step + checkStepHidden     2.2 step + stepOrders
 *   3.1 callBeforePdf + pdfRequired: true   3.2 callBeforePdf + pdfRequired function
 *   4.1 silent + checkStepHidden   4.2 silent + stepOrders
 * One template (1.1) can't be finished by an honest user because of how it is configured; its
 * tests pin what actually happens instead (see the comment there).
 */

const WORKFLOW_TEMPLATE_ID = 900002;
const TASK_TEMPLATES = {
  SOURCE_CHECK_STEP_HIDDEN: 900002001,
  SOURCE_STEP_ORDERS: 900002002,
  STEP_CHECK_STEP_HIDDEN: 900002003,
  STEP_STEP_ORDERS: 900002004,
  BEFORE_PDF_PDF_REQUIRED: 900002005,
  BEFORE_PDF_PDF_REQUIRED_FUNCTION: 900002006,
  SILENT_CHECK_STEP_HIDDEN: 900002007,
  SILENT_STEP_ORDERS: 900002008,
};

const RADIO_1 = 'Радіокнопка 1';
const RADIO_2 = 'Радіокнопка 2';
const YES = 'Так';
const NO = 'Ні';
const TAMPERED = 'TAMPERED';

const MISMATCH_ON_PUT = 'CalcTrigger recalculation mismatch';
const MISMATCH_ON_VALIDATE = /calcTrigger recalculation mismatch/i;
const INVALID_TRIGGER_PATH = 'Invalid trigger path';

const CABINET_URL = 'http://localhost:8081';

const isDocumentUpdate = (request) => request.method() === 'PUT' && /\/documents\/[^/?]+(\?|$)/.test(request.url());
const MISMATCH_LOG_TYPE = 'calc-triggers-validation-mismatch';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// Values the 1.1 / 1.2 `allStarsInfo` triggers calculate from the radio value.
const allStarsResults = (radio) => ({
  resultNumber: Number(radio.replace(/\D/g, '')),
  resultBoolean: Boolean(radio),
  resultObject: { stringOne: `${radio}(1)`, stringTwo: `${radio}(2)` },
  resultArrayOfStrings: [`${radio}(1)`, `${radio}(2)`],
  resultArrayOfObjects: [
    { stringOne: `${radio}(об'єкт 1 елемент 1)`, stringTwo: `${radio}(об'єкт 1 елемент 2)` },
    { stringOne: `${radio}(об'єкт 2 елемент 1)`, stringTwo: `${radio}(об'єкт 2 елемент 2)` },
  ],
});

const allStarsProperties = (radio, overrides = {}) => Object.entries({ radio, ...allStarsResults(radio), ...overrides })
  .map(([key, value]) => ({ path: `allStarsInfo.${key}`, value }));

test.describe('Workflow 900002 (calcTriggers validation)', () => {
  let context;
  let page;
  let api;
  let validateResponses = [];

  const startTask = async (taskTemplateId) => {
    const { status, body } = await api.createTask(WORKFLOW_TEMPLATE_ID, taskTemplateId);
    expect(status, `create task ${taskTemplateId}`).toBe(200);
    return body.data;
  };

  const getDocumentData = async (documentId) => {
    const { status, body } = await api.getDocument(documentId);
    expect(status).toBe(200);
    return body.data.data;
  };

  // Paths reported by /validate (or commit) as calcTrigger recalculation mismatches.
  const mismatchPaths = (body) => (body?.error?.details || [])
    .filter((detail) => MISMATCH_ON_VALIDATE.test(detail.message))
    .map((detail) => detail.dataPath);

  const validateMismatchPaths = async (documentId) => mismatchPaths((await api.validateDocument(documentId)).body);

  const expectRejectedAsMismatch = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.error.message).toContain(MISMATCH_ON_PUT);
  };

  const expectAccepted = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(200);
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

    // Every /validate answer the front got (validate before the PDF, or validate?commit=true).
    page.on('response', async (response) => {
      if (/\/documents\/[^/]+\/validate/.test(response.url())) {
        validateResponses.push({ status: response.status(), body: await response.json().catch(() => null) });
      }
    });
    log('✓ Cabinet ready');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe('1.1 source + checkStepHidden', () => {
    test('accepts honestly calculated targets of every type', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringSha256Info.radio', value: RADIO_1 },
        { path: 'stringSha256Info.result', value: sha256(RADIO_1) },
        ...allStarsProperties(RADIO_1),
      ]));

      const data = await getDocumentData(task.documentId);
      expect(data.allStarsInfo).toEqual({ radio: RADIO_1, ...allStarsResults(RADIO_1) });
      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });

    test('rejects a tampered string target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      // `stringInfo.radio` is readOnly, so the honest result is always `undefined`.
      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [{ path: 'stringInfo.result', value: TAMPERED }]));
    });

    test('rejects an unhashed value for a useSha256 target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringSha256Info.radio', value: RADIO_1 },
        { path: 'stringSha256Info.result', value: RADIO_1 },
      ]));
    });

    test('rejects a tampered number target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1, { resultNumber: 999 })));
    });

    test('rejects a tampered boolean target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1, { resultBoolean: false })));
    });

    test('rejects a tampered object target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1, {
        resultObject: { stringOne: `${RADIO_1}(1)`, stringTwo: TAMPERED },
      })));
    });

    test('rejects a tampered array-of-strings target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1, {
        resultArrayOfStrings: [`${RADIO_1}(1)`, TAMPERED],
      })));
    });

    test('rejects a tampered array-of-objects target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      const [first, second] = allStarsResults(RADIO_1).resultArrayOfObjects;
      expectRejectedAsMismatch(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1, {
        resultArrayOfObjects: [first, { ...second, stringTwo: TAMPERED }],
      })));
    });

    test('rejects a tampered object target sent as leaf sub-paths listed in triggerPath (like the front does on recalculation)', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1)));

      // Leaf sub-paths the client names as recalculated targets are checked on PUT, not only on /validate.
      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'allStarsInfo.radio', value: RADIO_2 },
        { path: 'allStarsInfo.resultObject.stringOne', value: `${RADIO_2}(1)` },
        { path: 'allStarsInfo.resultObject.stringTwo', value: TAMPERED },
      ], ['allStarsInfo.resultObject.stringOne', 'allStarsInfo.resultObject.stringTwo']));
    });

    test('accepts a leaf sub-path edit of an object target without triggerPath on PUT and flags it on /validate', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1)));

      // A plain edit under a target is left to /validate and commit, so the user's edit isn't lost on save.
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'allStarsInfo.resultObject.stringTwo', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).toContain('allStarsInfo.resultObject');
    });

    test('flags targets left stale after their source changed on /validate', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1)));

      // Only the source is written, so nothing is recalculated on PUT - a client skipping its triggers.
      expectAccepted(await api.updateDocument(task.documentId, [{ path: 'allStarsInfo.radio', value: RADIO_2 }]));

      const paths = await validateMismatchPaths(task.documentId);
      expect(paths).toEqual(expect.arrayContaining([
        'allStarsInfo.resultNumber',
        'allStarsInfo.resultObject',
        'allStarsInfo.resultArrayOfStrings',
        'allStarsInfo.resultArrayOfObjects',
      ]));
      // Boolean(radio) is `true` for both radio values, so this one is still correct.
      expect(paths).not.toContain('allStarsInfo.resultBoolean');
    });

    test('ignores a tampered target whose source step is hidden by checkStepHidden', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stepHiddenInfo.radio', value: RADIO_1 },
        { path: 'stepHiddenInfo.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('stepHiddenInfo.result');
    });

    test('ignores a tampered target whose source field is hidden by checkHidden', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'hiddenFieldInfo.radio', value: RADIO_1 },
        { path: 'hiddenFieldInfo.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('hiddenFieldInfo.result');
    });

    test('ignores a tampered target of a trigger with validate: false', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'indexInfo.resultArray', value: [{ fullName: TAMPERED }] },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('indexInfo.resultArray');
    });

    test('accepts an honest ${index} target sent with triggerPath', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'indexInfo.resultArray', value: [{ fullName: 'A' }, { fullName: 'B' }] },
      ]));

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'indexInfo.resultArray.0.date', value: '01.01.1990' },
        { path: 'indexInfo.resultArray.0.result', value: '01.01.1990 р.н.' },
      ], ['indexInfo.resultArray.0.result']));

      const data = await getDocumentData(task.documentId);
      expect(data.indexInfo.resultArray[0]).toEqual({ fullName: 'A', date: '01.01.1990', result: '01.01.1990 р.н.' });
    });

    test('rejects a tampered ${index} target sent with triggerPath', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'indexInfo.resultArray', value: [{ fullName: 'A' }, { fullName: 'B' }] },
      ]));

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'indexInfo.resultArray.1.date', value: '02.02.1992' },
        { path: 'indexInfo.resultArray.1.result', value: TAMPERED },
      ], ['indexInfo.resultArray.1.result']));
    });

    test('flags only the tampered array item of an ${index} target on /validate', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      // Writing the whole array doesn't touch the `${index}` target paths, so it isn't checked on PUT.
      expectAccepted(await api.updateDocument(task.documentId, [
        {
          path: 'indexInfo.resultArray',
          value: [
            { fullName: 'A', date: '01.01.1990', result: '01.01.1990 р.н.' },
            { fullName: 'B', date: '02.02.1992', result: TAMPERED },
          ],
        },
      ]));

      const paths = await validateMismatchPaths(task.documentId);
      expect(paths).toContain('indexInfo.resultArray.1.result');
      expect(paths).not.toContain('indexInfo.resultArray.0.result');
    });
  });

  test.describe('1.2 source + stepOrders', () => {
    test('accepts an honest target on a step listed in stepOrders', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_STEP_ORDERS);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: RADIO_1 },
        { path: 'stringInfo.result', value: RADIO_1 },
      ]));
    });

    test('rejects a tampered target on a step listed in stepOrders', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_STEP_ORDERS);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: RADIO_1 },
        { path: 'stringInfo.result', value: TAMPERED },
      ]));
    });

    test('ignores a tampered target on a step missing from stepOrders', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_STEP_ORDERS);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stepHiddenInfo.radio', value: RADIO_1 },
        { path: 'stepHiddenInfo.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('stepHiddenInfo.result');
    });
  });

  test.describe('2.1 step + checkStepHidden', () => {
    test('rejects a tampered target of a visible step', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: NO },
      ]));
    });

    test('rejects a tampered target of a step shown by checkStepHidden', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: TAMPERED },
      ]));
    });

    test('ignores a tampered target of a step hidden by checkStepHidden', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: NO },
        { path: 'stringInfo.result', value: NO },
        { path: 'hiddenStepResultInfo.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('hiddenStepResultInfo.result');
    });
  });

  test.describe('2.2 step + stepOrders', () => {
    test('accepts honest targets of steps listed in stepOrders', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_STEP_ORDERS);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: 'value' },
      ]));
      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });

    test('rejects a tampered target of a step listed in stepOrders regardless of the answer', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_STEP_ORDERS);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: NO },
        { path: 'stringInfo.result', value: NO },
        { path: 'hiddenStepResultInfo.result', value: TAMPERED },
      ]));
    });
  });

  test.describe('3.1 callBeforePdf + pdfRequired: true', () => {
    test('accepts an honest target', async () => {
      const task = await startTask(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED);

      expectAccepted(await api.updateDocument(task.documentId, [{ path: 'calculated.result', value: 'value' }]));
      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });

    test('rejects a tampered target', async () => {
      const task = await startTask(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [{ path: 'calculated.result', value: TAMPERED }]));
    });
  });

  test.describe('3.2 callBeforePdf + pdfRequired function', () => {
    test('rejects a tampered target when pdfRequired evaluates to true', async () => {
      const task = await startTask(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED_FUNCTION);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'emptyStepInfo.radio', value: YES },
        { path: 'calculated.result', value: TAMPERED },
      ]));
    });

    test('ignores a tampered target when pdfRequired evaluates to false', async () => {
      const task = await startTask(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED_FUNCTION);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'emptyStepInfo.radio', value: NO },
        { path: 'calculated.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('calculated.result');
    });
  });

  test.describe('4.1 silent trigger + checkStepHidden', () => {
    test('rejects a tampered target when more than one step is shown', async () => {
      const task = await startTask(TASK_TEMPLATES.SILENT_CHECK_STEP_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'calculated.result', value: TAMPERED },
      ]));
    });

    test('ignores a tampered target when only one step is shown', async () => {
      const task = await startTask(TASK_TEMPLATES.SILENT_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: NO },
        { path: 'calculated.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('calculated.result');
    });
  });

  test.describe('4.2 silent trigger + stepOrders', () => {
    test('rejects a tampered target when more than one step is shown', async () => {
      const task = await startTask(TASK_TEMPLATES.SILENT_STEP_ORDERS);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'calculated.result', value: TAMPERED },
      ]));
    });

    test('ignores a tampered target when only one step is shown', async () => {
      const task = await startTask(TASK_TEMPLATES.SILENT_STEP_ORDERS);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: NO },
        { path: 'calculated.result', value: TAMPERED },
      ]));
      expect(await validateMismatchPaths(task.documentId)).not.toContain('calculated.result');
    });
  });

  test.describe('triggerPath', () => {
    test('still silently drops a readOnly field written without triggerPath', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [{ path: 'stringInfo.radio', value: RADIO_1 }]));
      expect((await getDocumentData(task.documentId)).stringInfo?.radio).toBeUndefined();
    });

    test('rejects a triggerPath naming a readOnly field that is not a calcTrigger target', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      // The exploit fixed by the MR: naming any readOnly field in triggerPath used to unlock it.
      const response = await api.updateDocument(task.documentId, [{ path: 'stringInfo.radio', value: RADIO_1 }], ['stringInfo.radio']);
      expect(response.status, JSON.stringify(response.body)).toBe(400);
      expect(response.body.error.message).toContain(INVALID_TRIGGER_PATH);
      expect((await getDocumentData(task.documentId)).stringInfo?.radio).toBeUndefined();
    });

    test('rejects a triggerPath that is not an array', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);

      const response = await api.updateDocument(task.documentId, [{ path: 'stringInfo.result', value: RADIO_1 }], 'stringInfo.result');
      expect(response.status, JSON.stringify(response.body)).toBe(400);
      expect(response.body.error.message).toContain(INVALID_TRIGGER_PATH);
    });
  });

  test.describe('commit', () => {
    test('commits a task with honest targets via POST /tasks/:id/commit', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_STEP_ORDERS);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: 'value' },
      ]));

      expectAccepted(await api.commitTask(task.id));
      expect((await api.getTask(task.id)).body.data.finished).toBe(true);
    });

    test('refuses to commit a task with a stale target via POST /tasks/:id/commit', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_STEP_ORDERS);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: 'value' },
      ]));
      expectAccepted(await api.updateDocument(task.documentId, [{ path: 'stringInfo.radio', value: NO }]));

      const response = await api.commitTask(task.id);
      expect(response.status).not.toBe(200);
      expect(mismatchPaths(response.body)).toContain('stringInfo.result');
      expect((await api.getTask(task.id)).body.data.finished).toBe(false);
    });

    test('commits a task with honest targets via POST /documents/:id/validate?commit=true', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: 'value' },
      ]));

      expectAccepted(await api.validateDocument(task.documentId, { commit: true }));
      expect((await api.getTask(task.id)).body.data.finished).toBe(true);
    });

    test('refuses to commit a task with a stale target via POST /documents/:id/validate?commit=true', async () => {
      const task = await startTask(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'stringInfo.radio', value: YES },
        { path: 'stringInfo.result', value: YES },
        { path: 'hiddenStepResultInfo.result', value: 'value' },
      ]));
      expectAccepted(await api.updateDocument(task.documentId, [{ path: 'stringInfo.radio', value: NO }]));

      const response = await api.validateDocument(task.documentId, { commit: true });
      expect(response.status).not.toBe(200);
      expect(mismatchPaths(response.body)).toContain('stringInfo.result');
      expect((await api.getTask(task.id)).body.data.finished).toBe(false);
    });
  });

  test.describe('logging', () => {
    test('logs a mismatch with a dedicated log type and without the tampered value', async () => {
      const since = new Date(Date.now() - 1000);
      const task = await startTask(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED);
      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [{ path: 'calculated.result', value: TAMPERED }]));

      // Mismatches get a dedicated log type so they can be monitored.
      const mismatchLogLines = getDockerComposeLogs('task', since)
        .split('\n')
        .filter((line) => line.includes(MISMATCH_LOG_TYPE));
      expect(mismatchLogLines.length).toBeGreaterThan(0);
      expect(mismatchLogLines.join('\n')).toContain('calculated.result');
      expect(mismatchLogLines.join('\n')).not.toContain(TAMPERED);
    });
  });

  test.describe('honest user in the UI', () => {
    test.beforeEach(() => {
      validateResponses = [];
    });

    const openTaskInCabinet = async (taskTemplateId) => {
      await page.goto(`${CABINET_URL}/tasks/create/${WORKFLOW_TEMPLATE_ID}/${taskTemplateId}`);
      await page.waitForURL(/\/tasks\/[a-f0-9-]+\/[^/]+$/i);
      return page.url().match(/\/tasks\/([a-f0-9-]+)\//i)[1];
    };

    const expectStep = async (stepId) => {
      await expect(page).toHaveURL(new RegExp(`/tasks/[a-f0-9-]+/${stepId}$`));
    };

    const chooseRadio = async (name) => {
      await page.getByRole('radio', { name }).check();
    };

    const continueButton = () => page.getByRole('button', { name: 'Continue', exact: true });

    const goNext = async (nextStepId) => {
      await continueButton().click();
      await expectStep(nextStepId);
    };

    const fillDate = async (index, value) => {
      const input = page.getByRole('textbox', { name: 'Вкажіть дату народження' }).nth(index);
      await input.click();
      await input.pressSequentially(value.replace(/\D/g, ''));
      await expect(input).toHaveValue(value);
      await input.blur();
    };

    const finish = async () => {
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
    };

    // pdfRequired: the last step shows "Generate document", then the PDF preview has its own Finish.
    const generateDocument = async () => {
      await page.getByRole('button', { name: 'Generate document', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Print' })).toBeVisible({ timeout: 60000 });
    };


    const getTask = async (taskId) => {
      const { status, body } = await api.getTask(taskId);
      expect(status).toBe(200);
      return body.data;
    };


    const expectFinished = async (taskId) => {
      const completionDialog = page.getByRole('dialog');
      await completionDialog.waitFor({ timeout: 30000 });
      await expect(completionDialog).toContainText(/Success|submitted|sent|Thank you/i);

      expect(validateResponses.length, 'the front validated the document').toBeGreaterThan(0);
      for (const { status, body } of validateResponses) {
        expect(mismatchPaths(body), JSON.stringify(body)).toEqual([]);
        expect(status, JSON.stringify(body)).toBe(200);
      }

      const task = await getTask(taskId);
      expect(task.finished, 'task is finished').toBe(true);
      return task;
    };

    test.describe('1.1 source + checkStepHidden', () => {
      // The QA template makes `stringInfo.radio` readOnly and required. readOnly renders the radio
      // buttons disabled, so the first step can't be left, and the one target of a readOnly trigger
      // (`stringInfo.result`) is never calculated or sent with triggerPath.
      test.fixme('an honest user finishes the task without a calcTrigger mismatch', async () => {});

      test('keeps an honest user on the first step because its required radio is readOnly', async () => {
        const updates = [];
        const onRequest = (request) => {
          if (isDocumentUpdate(request)) updates.push(request.postDataJSON());
        };
        page.on('request', onRequest);

        try {
          await openTaskInCabinet(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
          await expectStep('stringInfo');

          await expect(page.getByRole('radio', { name: RADIO_1 })).toBeDisabled();
          await expect(page.getByRole('radio', { name: RADIO_2 })).toBeDisabled();

          await continueButton().click();
          await expect(page.getByRole('alert').filter({ hasText: 'Required field' }).first()).toBeVisible();
          await expectStep('stringInfo');
          expect(updates).toEqual([]);
        } finally {
          page.off('request', onRequest);
        }
      });
    });

    test.describe('1.2 source + stepOrders', () => {
      const fillStepsUpToIndexInfo = async () => {
        await expectStep('stringInfo');
        await chooseRadio(RADIO_1);
        await expect(page.getByRole('textbox', { name: 'Результат тригеру' })).toHaveValue(RADIO_1);
        await goNext('stringSha256Info');

        await chooseRadio(RADIO_1);
        await expect(page.getByRole('textbox', { name: /sha256/ })).toHaveValue(/^[a-f0-9]{64}$/);
        await goNext('allStarsInfo');

        await chooseRadio(RADIO_1);
        await expect(page.getByRole('textbox', { name: 'Результат розрахунку рядка в масиві рядків' }).first())
          .toHaveValue(`${RADIO_1}(1)`);
        await goNext('hiddenFieldInfo');

        // Leaving hiddenFieldInfo runs its step trigger, which creates the two array items.
        await goNext('indexInfo');
        await expect(page.getByRole('textbox', { name: 'Повне ім\'я' }).nth(1)).toHaveValue('Тестовий Петро Васильович');
      };

      test('an honest user finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.SOURCE_STEP_ORDERS);

        await fillStepsUpToIndexInfo();
        await fillDate(0, '01.01.1990');
        await fillDate(1, '02.02.1992');
        await expect(page.getByRole('textbox', { name: 'Результат тригеру' }).nth(1)).toHaveValue('02.02.1992 р.н.');

        await finish();
        const task = await expectFinished(taskId);
        const data = await getDocumentData(task.documentId);
        expect(data.stringInfo).toEqual({ radio: RADIO_1, result: RADIO_1 });
        expect(data.stringSha256Info.result).toMatch(/^[a-f0-9]{64}$/);
        expect(data.allStarsInfo).toEqual({
          radio: RADIO_1,
          resultNumber: 1,
          resultBoolean: true,
          resultObject: { stringOne: `${RADIO_1}(1)`, stringTwo: `${RADIO_1}(2)` },
          resultArrayOfStrings: [`${RADIO_1}(1)`, `${RADIO_1}(2)`],
          resultArrayOfObjects: [
            { stringOne: `${RADIO_1}(об'єкт 1 елемент 1)`, stringTwo: `${RADIO_1}(об'єкт 1 елемент 2)` },
            { stringOne: `${RADIO_1}(об'єкт 2 елемент 1)`, stringTwo: `${RADIO_1}(об'єкт 2 елемент 2)` },
          ],
        });
        expect(data.indexInfo).toEqual({
          resultArray: [
            { fullName: 'Тестовий Василь Петрович', date: '01.01.1990', result: '01.01.1990 р.н.' },
            { fullName: 'Тестовий Петро Васильович', date: '02.02.1992', result: '02.02.1992 р.н.' },
          ],
        });
      });
    });

    test.describe('2.1 step + checkStepHidden', () => {
      // "Ні" is disabled in the template, so "Так" (every step shown) is the only answer a user can pick.
      test('an honest user finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.STEP_CHECK_STEP_HIDDEN);

        await expectStep('stringInfo');
        await chooseRadio(YES);
        await goNext('hiddenStepInfo');
        await goNext('emptyStepInfo');

        await finish();
        const task = await expectFinished(taskId);
        const data = await getDocumentData(task.documentId);
        expect(data.stringInfo).toEqual({ radio: YES, result: YES });
        expect(data.hiddenStepResultInfo).toEqual({ result: 'value' });
      });
    });

    test.describe('2.2 step + stepOrders', () => {
      // "Ні" is disabled in the template, so "Так" is the only answer a user can pick.
      test('an honest user finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.STEP_STEP_ORDERS);

        await expectStep('stringInfo');
        await chooseRadio(YES);
        await goNext('hiddenStepInfo');
        await goNext('emptyStepInfo');

        await finish();
        const task = await expectFinished(taskId);
        const data = await getDocumentData(task.documentId);
        expect(data.stringInfo).toEqual({ radio: YES, result: YES });
        expect(data.hiddenStepResultInfo).toEqual({ result: 'value' });
      });
    });

    test.describe('3.1 callBeforePdf + pdfRequired: true', () => {
      test('an honest user finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED);

        await expectStep('emptyStepInfo');
        await generateDocument();
        await finish();
        const task = await expectFinished(taskId);
        expect((await getDocumentData(task.documentId)).calculated).toEqual({ result: 'value' });
      });
    });

    test.describe('3.2 callBeforePdf + pdfRequired function', () => {
      test('an honest user who needs a PDF finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED_FUNCTION);

        await expectStep('emptyStepInfo');
        await chooseRadio(YES);
        await generateDocument();
        await finish();
        const task = await expectFinished(taskId);
        expect((await getDocumentData(task.documentId)).calculated).toEqual({ result: 'value' });
      });

      test('an honest user who needs no PDF finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.BEFORE_PDF_PDF_REQUIRED_FUNCTION);

        await expectStep('emptyStepInfo');
        await chooseRadio(NO);
        await finish();
        await expectFinished(taskId);
      });
    });

    test.describe('4.1 silent + checkStepHidden', () => {
      test('an honest user who sees both steps finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.SILENT_CHECK_STEP_HIDDEN);

        await expectStep('stringInfo');
        await chooseRadio(YES);
        await goNext('hiddenStepInfo');
        await generateDocument();
        await finish();
        const task = await expectFinished(taskId);
        expect((await getDocumentData(task.documentId)).calculated).toEqual({ result: 'value' });
      });

      test('an honest user who sees one step finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.SILENT_CHECK_STEP_HIDDEN);

        await expectStep('stringInfo');
        await chooseRadio(NO);
        await generateDocument();
        await finish();
        await expectFinished(taskId);
      });
    });

    test.describe('4.2 silent + stepOrders', () => {
      test('an honest user who sees both steps finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.SILENT_STEP_ORDERS);

        await expectStep('stringInfo');
        await chooseRadio(YES);
        await goNext('hiddenStepInfo');
        await generateDocument();
        await finish();
        const task = await expectFinished(taskId);
        expect((await getDocumentData(task.documentId)).calculated).toEqual({ result: 'value' });
      });

      test('an honest user who sees one step finishes the task without a calcTrigger mismatch', async () => {
        const taskId = await openTaskInCabinet(TASK_TEMPLATES.SILENT_STEP_ORDERS);

        await expectStep('stringInfo');
        await chooseRadio(NO);
        await generateDocument();
        await finish();
        await expectFinished(taskId);
      });
    });
  });
});
