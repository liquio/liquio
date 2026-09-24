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
 * Only 1.1 had `validate: true` in the original export; the fixture adds it to every trigger of
 * 1.2-4.2 so the rules are exercised. 1.1 keeps its one `validate: false` trigger as the opt-out case.
 *
 * The UI never sends a tampered value, so the cases drive the cabinet API directly as the
 * logged-in user - which is exactly what an attacker with devtools would do.
 *
 * Expected results describe the intended server-side validation behaviour.
 */

const WORKFLOW_TEMPLATE_ID = 1000365;
const TASK_TEMPLATES = {
  SOURCE_CHECK_STEP_HIDDEN: 1000365001,
  SOURCE_STEP_ORDERS: 1000365002,
  STEP_CHECK_STEP_HIDDEN: 1000365003,
  STEP_STEP_ORDERS: 1000365004,
  BEFORE_PDF_PDF_REQUIRED: 1000365005,
  BEFORE_PDF_PDF_REQUIRED_FUNCTION: 1000365006,
  SILENT_CHECK_STEP_HIDDEN: 1000365007,
  SILENT_STEP_ORDERS: 1000365008,
};

const RADIO_1 = 'Радіокнопка 1';
const RADIO_2 = 'Радіокнопка 2';
const YES = 'Так';
const NO = 'Ні';
const TAMPERED = 'TAMPERED';

const MISMATCH_ON_PUT = 'CalcTrigger recalculation mismatch';
const MISMATCH_ON_VALIDATE = /calcTrigger recalculation mismatch/i;
const INVALID_TRIGGER_PATH = 'Invalid trigger path';
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

test.describe('Workflow 1000365 (calcTriggers validation)', () => {
  let api;

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

    log('Importing workflow 1000365 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-1000365.bpmn', false, true);
    await adminPage.goto('http://localhost:8082/workflow/1000365');
    await expect(adminPage).toHaveTitle(/^calcTriggers/);
    await adminPage.context().close();
    log('✓ Workflow 1000365 imported');

    log('Logging in to cabinet as demo user');
    const userPage = await (await browser.newContext()).newPage();
    await setupLogging(userPage);
    userPage.setDefaultTimeout(15000);
    await userPage.goto('http://localhost:8081/');
    await userPage.waitForLoadState('networkidle');
    if (userPage.url().includes('localhost:8080')) {
      await ensureAtLoginPage(userPage);
      await loginWithPersonalKey(userPage, '../config/demo.p12', 'demo');
    }
    await expect(userPage).toHaveURL(/^http:\/\/localhost:8081/);
    api = await createCabinetApi(userPage);
    log('✓ Cabinet API ready');
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

    test('rejects a tampered object target sent as leaf sub-paths (like the front does on recalculation)', async () => {
      const task = await startTask(TASK_TEMPLATES.SOURCE_CHECK_STEP_HIDDEN);
      expectAccepted(await api.updateDocument(task.documentId, allStarsProperties(RADIO_1)));

      // Leaf sub-paths of an object target must be checked on PUT too, not only on /validate.
      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'allStarsInfo.radio', value: RADIO_2 },
        { path: 'allStarsInfo.resultObject.stringOne', value: `${RADIO_2}(1)` },
        { path: 'allStarsInfo.resultObject.stringTwo', value: TAMPERED },
      ]));
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
});
