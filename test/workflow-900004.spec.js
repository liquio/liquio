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
 * Cabinet step navigation when a trigger that runs on Continue changes which steps are shown.
 * On Continue the front runs the step's silent triggers, saves the document, recomputes the step
 * list and opens the step at the next index of the new list. One entry task per case:
 *   1 later step appears on Next            - s2 is hidden until the s1 step trigger sets a flag
 *   2 earlier step disappears on Next       - the s2 step trigger hides s1 while the user is on s2
 *   3 current step disappears on Next       - the s2 step trigger hides s2 itself
 *   4 stepOrders names a step without a schema - stepOrders is ['s1', 'ghost', 's2']
 * The flags live on a `calculated` step that is always hidden, so it never counts as a step.
 * No template needs a PDF or a signature, so Finish commits the task right away.
 */

const WORKFLOW_TEMPLATE_ID = 900004;
const TASK_TEMPLATES = {
  LATER_STEP_APPEARS: 900004001,
  EARLIER_STEP_DISAPPEARS: 900004002,
  CURRENT_STEP_DISAPPEARS: 900004003,
  STEP_WITHOUT_SCHEMA: 900004004,
};

const YES = 'Так';
const NOT_CONFIGURED = 'The service is not configured';

const CABINET_URL = 'http://localhost:8081';

const isDocumentUpdate = (request) => request.method() === 'PUT' && /\/documents\/[^/?]+(\?|$)/.test(request.url());

test.describe('Workflow 900004 (step navigation with calcTriggers)', () => {
  let context;
  let page;
  let api;
  let visitedUrls = [];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 900004 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-900004.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900004');
      await expect(adminPage).toHaveTitle(/^calcTriggers steps/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();
    log('✓ Workflow 900004 imported');

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

    // Every URL the cabinet showed, including the history.replace() step changes.
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visitedUrls.push(frame.url());
    });
    log('✓ Cabinet ready');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.beforeEach(() => {
    visitedUrls = [];
  });

  const openTaskInCabinet = async (taskTemplateId) => {
    await page.goto(`${CABINET_URL}/tasks/create/${WORKFLOW_TEMPLATE_ID}/${taskTemplateId}`);
    await page.waitForURL(/\/tasks\/[a-f0-9-]+\/[^/]+$/i);
    return page.url().match(/\/tasks\/([a-f0-9-]+)\//i)[1];
  };

  const stepUrl = (stepId) => new RegExp(`/tasks/[a-f0-9-]+/${stepId}$`);

  const expectStep = async (stepId) => {
    await expect(page).toHaveURL(stepUrl(stepId));
  };

  // The step form's heading is the step description.
  const stepHeading = (description) => page.getByRole('heading', { level: 2, name: description, exact: true });

  // The stepper lists the steps currently in the step list.
  const stepperItem = (description) => page.getByRole('button', { name: new RegExp(`^Step \\d+ ${description}$`) });

  const expectStepShown = async (stepId, description) => {
    await expectStep(stepId);
    await expect(stepHeading(description)).toBeVisible();
  };

  const visitedStep = (stepId) => visitedUrls.some((url) => stepUrl(stepId).test(url));

  const chooseRadio = async (name) => {
    await page.getByRole('radio', { name }).check();
  };

  const continueButton = () => page.getByRole('button', { name: 'Continue', exact: true });

  const goNext = async (nextStepId) => {
    await continueButton().click();
    await expectStep(nextStepId);
  };

  const finish = async () => {
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
  };

  const getTask = async (taskId) => {
    const { status, body } = await api.getTask(taskId);
    expect(status).toBe(200);
    return body.data;
  };

  const getDocumentData = async (taskId) => {
    const { documentId } = await getTask(taskId);
    const { status, body } = await api.getDocument(documentId);
    expect(status).toBe(200);
    return body.data.data;
  };

  const expectFinished = async (taskId) => {
    const completionDialog = page.getByRole('dialog');
    await completionDialog.waitFor({ timeout: 30000 });
    await expect(completionDialog).toContainText(/Success|submitted|sent|Thank you/i);

    const task = await getTask(taskId);
    expect(task.finished, 'task is finished').toBe(true);
    return task;
  };

  // Continue has done its work once the document with the trigger result is saved and the
  // button can be pressed again.
  const continueAndSettle = async () => {
    const saved = page.waitForResponse((response) => isDocumentUpdate(response.request()));
    await continueButton().click();
    await saved;
    await expect(continueButton()).toBeEnabled();
  };

  test.describe('1 later step appears on Next', () => {
    test('opens the step that the trigger of the current step has just shown', async () => {
      const taskId = await openTaskInCabinet(TASK_TEMPLATES.LATER_STEP_APPEARS);

      await expectStepShown('s1', 'Крок 1');
      await expect(stepperItem('Крок 3')).toBeVisible();
      await expect(stepperItem('Крок 2'), 's2 is hidden before Continue').toHaveCount(0);

      await chooseRadio(YES);
      await goNext('s2');
      await expect(stepHeading('Крок 2')).toBeVisible();
      await expect(stepperItem('Крок 2')).toBeVisible();
      expect((await getDocumentData(taskId)).calculated).toEqual({ showS2: true });

      await goNext('s3');
      await finish();
      await expectFinished(taskId);
    });
  });

  test.describe('2 earlier step disappears on Next', () => {
    // The next index is taken from the old list [s1, s2, s3] (s2 is at 1), but the new list is
    // [s2, s3], so index 2 is past its end and the user stays where they are.
    test('stays on the current step when the trigger hides an earlier step', async () => {
      const taskId = await openTaskInCabinet(TASK_TEMPLATES.EARLIER_STEP_DISAPPEARS);

      await expectStepShown('s1', 'Крок 1');
      await goNext('s2');
      await expect(stepHeading('Крок 2')).toBeVisible();
      await expect(stepperItem('Крок 1')).toBeVisible();

      await chooseRadio(YES);
      await continueAndSettle();

      await expectStepShown('s2', 'Крок 2');
      await expect(stepperItem('Крок 1'), 's1 is hidden after Continue').toHaveCount(0);
      await expect(stepperItem('Крок 3')).toBeVisible();
      expect(visitedStep('s3'), 's3 is never opened').toBe(false);
      expect((await getDocumentData(taskId)).calculated).toEqual({ hideS1: true });
      expect((await getTask(taskId)).finished, 'task is not finished').toBe(false);
    });
  });

  test.describe('3 current step disappears on Next', () => {
    // The front finishes editing as soon as the trigger hides s2, while the document with the new
    // flag is still being saved. The steps it sees next depend on which answer comes first, so the
    // screen after the commit is not asserted - only that the task is committed and s3 is not shown.
    test('commits the task when the trigger hides the current step', async () => {
      const taskId = await openTaskInCabinet(TASK_TEMPLATES.CURRENT_STEP_DISAPPEARS);

      await expectStepShown('s1', 'Крок 1');
      await goNext('s2');
      await expect(stepHeading('Крок 2')).toBeVisible();

      await continueButton().click();

      await expect(async () => {
        expect((await getTask(taskId)).finished, 'task is finished').toBe(true);
      }).toPass({ timeout: 30000 });
      await expect(continueButton()).toHaveCount(0);
      await expect(stepHeading('Крок 3')).toHaveCount(0);
      expect((await getDocumentData(taskId)).calculated).toEqual({ leftS2: true });
    });
  });

  test.describe('4 stepOrders names a step without a schema', () => {
    test('opens the step without a schema on Continue and shows that the service is not configured', async () => {
      const taskId = await openTaskInCabinet(TASK_TEMPLATES.STEP_WITHOUT_SCHEMA);

      await expectStepShown('s1', 'Крок 1');
      await goNext('ghost');

      await expect(page.getByText(NOT_CONFIGURED)).toBeVisible();
      await expect(continueButton()).toHaveCount(0);
      expect(visitedStep('s2'), 's2 is never opened').toBe(false);
      expect((await getTask(taskId)).finished, 'task is not finished').toBe(false);
    });

    // Opening a step checks every step before it; a step without a schema never passes.
    test('sends a user who opens a later step back to the step without a schema', async () => {
      const taskId = await openTaskInCabinet(TASK_TEMPLATES.STEP_WITHOUT_SCHEMA);
      await expectStepShown('s1', 'Крок 1');

      await page.goto(`${CABINET_URL}/tasks/${taskId}/s2`);

      await expectStep('ghost');
      await expect(page.getByText(NOT_CONFIGURED)).toBeVisible();
      expect((await getTask(taskId)).finished, 'task is not finished').toBe(false);
    });
  });
});
