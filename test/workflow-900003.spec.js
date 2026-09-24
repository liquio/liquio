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
 * Server-side calcTriggers validation (`validate: true`) edge cases, one entry task per case:
 *   1 userInfo in calculate            - the logged-in user's info reaches `calculate` on PUT, /validate and commit
 *   2 checkReadonly                    - `checkReadonly: true` fields vs `triggerPath`
 *   3 cleanWhenHidden target           - a `cleanWhenHidden` + `checkHidden: true` target of a checked trigger
 *   4 readOnly object and array targets - PUT bodies exactly as the front sends them: the whole value on first
 *                                        fill, leaf sub-paths (with the same sub-paths in `triggerPath`) on recalculation
 *
 * The cases drive the cabinet API directly as the logged-in user.
 *
 * Honest user in the UI (`honest user in the UI` block):
 * readOnly calcTrigger targets saved from the cabinet UI.
 * Template 4 of the edge-case workflow has three triggers with `readOnly: true` and `validate: true`
 * whose targets are readOnly fields (a string, an object and an array). The server drops readOnly
 * fields on PUT unless the front names them in `triggerPath`, so these tests check what the front
 * really sends and that an honest user can still finish the task.
 */

const WORKFLOW_TEMPLATE_ID = 900003;
const TASK_TEMPLATES = {
  USER_INFO: 900003001,
  CHECK_READONLY: 900003002,
  CLEAN_WHEN_HIDDEN: 900003003,
  READONLY_OBJECT_AND_ARRAY: 900003004,
};

const TAMPERED = 'TAMPERED';

const MISMATCH_ON_PUT = 'CalcTrigger recalculation mismatch';
const MISMATCH_ON_VALIDATE = /calcTrigger recalculation mismatch/i;
const INVALID_TRIGGER_PATH = 'Invalid trigger path';

const CABINET_URL = 'http://localhost:8081';

const isDocumentUpdate = (request) => request.method() === 'PUT' && /\/documents\/[^/?]+(\?|$)/.test(request.url());

test.describe('Workflow 900003 (calcTriggers validation edge cases)', () => {
  let context;
  let page;
  let api;
  let documentUpdates = [];
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

  const expectRejectedAsInvalidTriggerPath = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.error.message).toContain(INVALID_TRIGGER_PATH);
  };

  const expectAccepted = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 900003 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-900003.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900003');
      await expect(adminPage).toHaveTitle(/^calcTriggers/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();
    log('✓ Workflow 900003 imported');

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

    // Every document PUT with its answer, and every /validate answer the front got.
    page.on('response', async (response) => {
      if (isDocumentUpdate(response.request())) {
        documentUpdates.push({ status: response.status(), body: response.request().postDataJSON() });
      }
      if (/\/documents\/[^/]+\/validate/.test(response.url())) {
        validateResponses.push({ status: response.status(), body: await response.json().catch(() => null) });
      }
    });
    log('✓ Cabinet ready');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe('1 userInfo in calculate', () => {
    // The task is assigned to the workflow owner - the logged-in user.
    const startUserInfoTask = async () => {
      const task = await startTask(TASK_TEMPLATES.USER_INFO);
      const [userId] = task.performerUsers;
      expect(userId, 'the task is assigned to the logged-in user').toBeTruthy();
      return { task, userId };
    };

    // What the front sends once the trigger recalculated the readOnly target.
    const recalculatedProperties = (userId) => [
      { path: 'userStep.input', value: 'value' },
      { path: 'userStep.userId', value: userId },
    ];

    // A parent object write is not checked on PUT, so a wrong value can reach /validate and commit.
    const storeWrongUserId = async (documentId) => {
      expectAccepted(await api.updateDocument(documentId, [{ path: 'userStep', value: { input: 'value', userId: 'another-user-id' } }]));
    };

    test('accepts the logged-in user id on PUT', async () => {
      const { task, userId } = await startUserInfoTask();

      expectAccepted(await api.updateDocument(task.documentId, recalculatedProperties(userId), ['userStep.userId']));
      expect((await getDocumentData(task.documentId)).userStep).toEqual({ input: 'value', userId });
    });

    test('rejects another user id on PUT', async () => {
      const { task } = await startUserInfoTask();

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, recalculatedProperties('another-user-id'), ['userStep.userId']));
    });

    test('reports no mismatch for the logged-in user id on /validate', async () => {
      const { task, userId } = await startUserInfoTask();
      expectAccepted(await api.updateDocument(task.documentId, recalculatedProperties(userId), ['userStep.userId']));

      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });

    test('reports another user id as a mismatch on /validate', async () => {
      const { task } = await startUserInfoTask();
      await storeWrongUserId(task.documentId);

      expect(await validateMismatchPaths(task.documentId)).toEqual(['userStep.userId']);
    });

    test('commits a task with the logged-in user id via POST /tasks/:id/commit', async () => {
      const { task, userId } = await startUserInfoTask();
      expectAccepted(await api.updateDocument(task.documentId, recalculatedProperties(userId), ['userStep.userId']));

      expectAccepted(await api.commitTask(task.id));
      expect((await api.getTask(task.id)).body.data.finished).toBe(true);
    });

    test('refuses to commit a task with another user id via POST /tasks/:id/commit', async () => {
      const { task } = await startUserInfoTask();
      await storeWrongUserId(task.documentId);

      const response = await api.commitTask(task.id);
      expect(response.status).not.toBe(200);
      expect(mismatchPaths(response.body)).toEqual(['userStep.userId']);
      expect((await api.getTask(task.id)).body.data.finished).toBe(false);
    });

    test('commits a task with the logged-in user id via POST /documents/:id/validate?commit=true', async () => {
      const { task, userId } = await startUserInfoTask();
      expectAccepted(await api.updateDocument(task.documentId, recalculatedProperties(userId), ['userStep.userId']));

      expectAccepted(await api.validateDocument(task.documentId, { commit: true }));
      expect((await api.getTask(task.id)).body.data.finished).toBe(true);
    });

    test('refuses to commit a task with another user id via POST /documents/:id/validate?commit=true', async () => {
      const { task } = await startUserInfoTask();
      await storeWrongUserId(task.documentId);

      const response = await api.validateDocument(task.documentId, { commit: true });
      expect(response.status).not.toBe(200);
      expect(mismatchPaths(response.body)).toEqual(['userStep.userId']);
      expect((await api.getTask(task.id)).body.data.finished).toBe(false);
    });
  });

  test.describe('2 checkReadonly', () => {
    test('silently drops a checkReadonly: true field written without triggerPath', async () => {
      const task = await startTask(TASK_TEMPLATES.CHECK_READONLY);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'lockStep.input', value: 'value' },
        { path: 'lockStep.locked', value: TAMPERED },
      ]));
      expect((await getDocumentData(task.documentId)).lockStep).toEqual({ input: 'value' });
    });

    test('rejects a triggerPath naming a checkReadonly: true field that is not a calcTrigger target', async () => {
      const task = await startTask(TASK_TEMPLATES.CHECK_READONLY);

      expectRejectedAsInvalidTriggerPath(await api.updateDocument(task.documentId, [
        { path: 'lockStep.locked', value: TAMPERED },
      ], ['lockStep.locked']));
      expect((await getDocumentData(task.documentId)).lockStep?.locked).toBeUndefined();
    });

    test('accepts a triggerPath naming a checkReadonly: true calcTrigger target but still does not write it', async () => {
      const task = await startTask(TASK_TEMPLATES.CHECK_READONLY);

      // triggerPath only lifts `readOnly`; `checkReadonly` keeps the field closed to the client.
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'lockStep.input', value: 'value' },
        { path: 'lockStep.lockedTarget', value: 'value' },
      ], ['lockStep.lockedTarget']));
      expect((await getDocumentData(task.documentId)).lockStep).toEqual({ input: 'value' });
    });
  });

  test.describe('3 cleanWhenHidden target', () => {
    test('rejects a tampered cleanWhenHidden target hidden by checkHidden when it is written directly', async () => {
      const task = await startTask(TASK_TEMPLATES.CLEAN_WHEN_HIDDEN);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'hideStep.input', value: 'value' },
        { path: 'hideStep.result', value: TAMPERED },
      ]));
    });

    test('still reports a tampered cleanWhenHidden target hidden by checkHidden on /validate', async () => {
      const task = await startTask(TASK_TEMPLATES.CLEAN_WHEN_HIDDEN);

      // Written through its parent object, so it isn't checked on PUT. The cleanWhenHidden filter
      // only drops keyword errors: a calcTrigger mismatch is still reported.
      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'hideStep', value: { input: 'value', result: TAMPERED } },
      ]));
      expect(await validateMismatchPaths(task.documentId)).toEqual(['hideStep.result']);
    });

    test('reports no mismatch for an honest cleanWhenHidden target hidden by checkHidden on /validate', async () => {
      const task = await startTask(TASK_TEMPLATES.CLEAN_WHEN_HIDDEN);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'hideStep.input', value: 'value' },
        { path: 'hideStep.result', value: 'value!' },
      ]));
      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });
  });

  test.describe('4 readOnly object and array targets', () => {
    const OBJECT_TRIGGER_PATHS = ['calc.resultObject.name', 'calc.resultObject.len'];

    // First fill: the front sends every target as a whole value.
    const firstFill = async (documentId, input) => {
      expectAccepted(await api.updateDocument(documentId, [
        { path: 'calc.input', value: input },
        { path: 'calc.upper', value: input.toUpperCase() },
        { path: 'calc.resultObject', value: { name: input, len: input.length } },
        { path: 'calc.resultArray', value: input.split('') },
      ], ['calc.upper', 'calc.resultObject', 'calc.resultArray']));
    };

    test('accepts an honest scalar target', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'ab' },
        { path: 'calc.upper', value: 'AB' },
      ], ['calc.upper']));
      expect((await getDocumentData(task.documentId)).calc.upper).toBe('AB');
    });

    test('rejects a tampered scalar target', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'ab' },
        { path: 'calc.upper', value: TAMPERED },
      ], ['calc.upper']));
    });

    test('accepts the first fill of an object target and stores it as sent', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'ab' },
        { path: 'calc.resultObject', value: { name: 'ab', len: 2 } },
      ], ['calc.resultObject']));
      expect((await getDocumentData(task.documentId)).calc.resultObject).toEqual({ name: 'ab', len: 2 });
    });

    test('accepts an honest recalculation of an object target sent as leaf sub-paths', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);
      await firstFill(task.documentId, 'ab');

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.upper', value: 'ABC' },
        { path: 'calc.resultObject.name', value: 'abc' },
        { path: 'calc.resultObject.len', value: 3 },
        { path: 'calc.resultArray.2', value: 'c' },
      ], ['calc.upper', ...OBJECT_TRIGGER_PATHS, 'calc.resultArray.2']));
      expect((await getDocumentData(task.documentId)).calc).toEqual({
        input: 'abc',
        upper: 'ABC',
        resultObject: { name: 'abc', len: 3 },
        resultArray: ['a', 'b', 'c'],
      });
      expect(await validateMismatchPaths(task.documentId)).toEqual([]);
    });

    test('rejects a tampered recalculation of an object target sent as leaf sub-paths', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);
      await firstFill(task.documentId, 'ab');

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.resultObject.name', value: 'abc' },
        { path: 'calc.resultObject.len', value: 99 },
      ], OBJECT_TRIGGER_PATHS));
      expect((await getDocumentData(task.documentId)).calc.resultObject).toEqual({ name: 'ab', len: 2 });
    });

    test('accepts an honest recalculation of an array target sent as an item path', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);
      await firstFill(task.documentId, 'ab');

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.resultArray.2', value: 'c' },
      ], ['calc.resultArray.2']));
      expect((await getDocumentData(task.documentId)).calc.resultArray).toEqual(['a', 'b', 'c']);
    });

    test('rejects a tampered recalculation of an array target sent as an item path', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);
      await firstFill(task.documentId, 'ab');

      expectRejectedAsMismatch(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.resultArray.2', value: TAMPERED },
      ], ['calc.resultArray.2']));
    });

    test('accepts the first fill of an array target and stores it as sent', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.input', value: 'ab' },
        { path: 'calc.resultArray', value: ['a', 'b'] },
      ], ['calc.resultArray']));
      expect((await getDocumentData(task.documentId)).calc.resultArray).toEqual(['a', 'b']);
    });

    test('silently drops leaf sub-paths of a readOnly object target sent without triggerPath', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);
      await firstFill(task.documentId, 'ab');

      expectAccepted(await api.updateDocument(task.documentId, [
        { path: 'calc.resultObject.name', value: TAMPERED },
      ]));
      expect((await getDocumentData(task.documentId)).calc.resultObject).toEqual({ name: 'ab', len: 2 });
    });

    test('rejects a triggerPath naming a sibling that shares the target name as a prefix', async () => {
      const task = await startTask(TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY);

      expectRejectedAsInvalidTriggerPath(await api.updateDocument(task.documentId, [
        { path: 'calc.resultObjectX', value: TAMPERED },
      ], ['calc.resultObjectX']));
    });
  });

  test.describe('honest user in the UI', () => {
    test.beforeEach(() => {
      documentUpdates = [];
      validateResponses = [];
    });

    const openTaskInCabinet = async () => {
      await page.goto(`${CABINET_URL}/tasks/create/${WORKFLOW_TEMPLATE_ID}/${TASK_TEMPLATES.READONLY_OBJECT_AND_ARRAY}`);
      await page.waitForURL(/\/tasks\/[a-f0-9-]+\/calc$/i);
      return page.url().match(/\/tasks\/([a-f0-9-]+)\//i)[1];
    };

    const typeSource = async (value) => {
      const input = page.getByRole('textbox', { name: 'Джерело' });
      await input.fill(value);
      await input.blur();
    };

    // Waits for the PUT that saved `value` of `calc.input` and returns its body.
    const waitForSourceSaved = (value) => page.waitForResponse((response) => isDocumentUpdate(response.request())
      && (response.request().postDataJSON()?.properties || [])
        .some(({ path, value: sent }) => path === 'calc.input' && sent === value));


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
        expect((body?.error?.details || []).filter((detail) => MISMATCH_ON_VALIDATE.test(detail.message)), JSON.stringify(body)).toEqual([]);
        expect(status, JSON.stringify(body)).toBe(200);
      }

      const task = await getTask(taskId);
      expect(task.finished, 'task is finished').toBe(true);
      return task;
    };

    test('sends the readOnly targets with triggerPath on the first fill and stores them', async () => {
      const task = await getTask(await openTaskInCabinet());

      const saved = waitForSourceSaved('ab');
      await typeSource('ab');
      const response = await saved;
      expect(response.status()).toBe(200);

      const body = response.request().postDataJSON();
      expect(body.properties).toEqual(expect.arrayContaining([
        { path: 'calc.input', value: 'ab' },
        { path: 'calc.upper', value: 'AB' },
        { path: 'calc.resultObject', value: { name: 'ab', len: 2 } },
        { path: 'calc.resultArray', value: ['a', 'b'] },
      ]));
      expect([...body.triggerPath].sort()).toEqual(['calc.resultArray', 'calc.resultObject', 'calc.upper']);

      expect((await getDocumentData(task.documentId)).calc).toEqual({
        input: 'ab',
        upper: 'AB',
        resultObject: { name: 'ab', len: 2 },
        resultArray: ['a', 'b'],
      });
    });

    test('sends the changed parts of recalculated readOnly targets with triggerPath', async () => {
      const task = await getTask(await openTaskInCabinet());

      const first = waitForSourceSaved('ab');
      await typeSource('ab');
      expect((await first).status()).toBe(200);

      const second = waitForSourceSaved('abc');
      await typeSource('abc');
      const response = await second;
      expect(response.status()).toBe(200);

      // The front sends only the parts that changed: leaf paths of the object, the new array item.
      const body = response.request().postDataJSON();
      expect(body.properties.map(({ path, value }) => ({ path, value }))).toEqual(expect.arrayContaining([
        { path: 'calc.input', value: 'abc' },
        { path: 'calc.upper', value: 'ABC' },
        { path: 'calc.resultObject.name', value: 'abc' },
        { path: 'calc.resultObject.len', value: 3 },
        { path: 'calc.resultArray.2', value: 'c' },
      ]));
      expect([...body.triggerPath].sort()).toEqual([
        'calc.resultArray.2',
        'calc.resultObject.len',
        'calc.resultObject.name',
        'calc.upper',
      ]);

      expect((await getDocumentData(task.documentId)).calc).toEqual({
        input: 'abc',
        upper: 'ABC',
        resultObject: { name: 'abc', len: 3 },
        resultArray: ['a', 'b', 'c'],
      });
    });

    test('an honest user finishes the task without a calcTrigger mismatch', async () => {
      const taskId = await openTaskInCabinet();

      const saved = waitForSourceSaved('xyz');
      await typeSource('xyz');
      expect((await saved).status()).toBe(200);

      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+\/lastStep$/);
      await page.getByRole('button', { name: 'Finish', exact: true }).click();

      await expectFinished(taskId);
      expect(documentUpdates.every(({ status }) => status === 200), JSON.stringify(documentUpdates)).toBe(true);
    });
  });
});
