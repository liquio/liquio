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
 */

const WORKFLOW_TEMPLATE_ID = 1000367;
const TASK_TEMPLATES = {
  USER_INFO: 1000367001,
  CHECK_READONLY: 1000367002,
  CLEAN_WHEN_HIDDEN: 1000367003,
  READONLY_OBJECT_AND_ARRAY: 1000367004,
};

const TAMPERED = 'TAMPERED';

const MISMATCH_ON_PUT = 'CalcTrigger recalculation mismatch';
const MISMATCH_ON_VALIDATE = /calcTrigger recalculation mismatch/i;
const INVALID_TRIGGER_PATH = 'Invalid trigger path';

test.describe('Workflow 1000367 (calcTriggers validation edge cases)', () => {
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

  const expectRejectedAsInvalidTriggerPath = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.error.message).toContain(INVALID_TRIGGER_PATH);
  };

  const expectAccepted = (response) => {
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 1000367 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-1000367.bpmn', false, true);
    await adminPage.goto('http://localhost:8082/workflow/1000367');
    await expect(adminPage).toHaveTitle(/^calcTriggers/);
    await adminPage.context().close();
    log('✓ Workflow 1000367 imported');

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
});
