const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  setupLogging,
  log,
} = require('./helpers');

test.describe('Workflow 1001 (Notification Event)', () => {
  test('import, run from cabinet, and verify workflow journal', async ({ page }) => {
    await setupLogging(page);
    page.setDefaultTimeout(5000);

    // 1) Login as admin.
    log('Going to admin at http://localhost:8082/');
    await page.goto('http://localhost:8082/');
    await ensureAtLoginPage(page);
    log('Logging in as admin with personal key');
    await loginWithPersonalKey(page, '../config/admin.p12', 'admin');
    await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);

    // 2) Import workflow from examples (run twice to validate overwrite idempotency).
    log('Importing workflow 1001 from examples/workflow-1001.bpmn (pass 1)');
    await importWorkflow(page, '../examples/workflow-1001.bpmn', false, true);

    log('Importing workflow 1001 again to verify idempotent overwrite behavior (pass 2)');
    await importWorkflow(page, '../examples/workflow-1001.bpmn', false, true);

    log('Verifying workflow 1001 exists in admin');
    await page.goto('http://localhost:8082/workflow/1001');
    await expect(page).toHaveTitle(/Notification Test Workflow/i);

    // 3) Navigate to cabinet.
    log('Navigating to cabinet at http://localhost:8081/');
    await page.goto('http://localhost:8081/');
    await page.waitForLoadState('networkidle');

    // If redirected to login, authenticate as end user.
    if (page.url().includes('localhost:8080')) {
      log('Cabinet redirected to login, logging in as demo user');
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/demo.p12', 'demo');
    }

    // 4) Start the service from direct cabinet path.
    log('Starting service from /tasks/create/1001/1001001');
    await page.goto('http://localhost:8081/tasks/create/1001/1001001');

    if (page.url().includes('localhost:8080')) {
      log('Service start redirected to login, logging in as demo user again');
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/demo.p12', 'demo');
      await page.goto('http://localhost:8081/tasks/create/1001/1001001');
    }

    // 5) Click through and remember workflow id.
    log('Waiting for task step to load');
    await page.waitForURL(/\/tasks\/[a-f0-9-]+\/.+/i);

    const finishButton = page.getByRole('button', { name: /Finish/i });
    await finishButton.waitFor({ timeout: 15000 });
    log('Clicking Finish');
    await finishButton.click();

    const completionDialog = page.getByRole('dialog');
    await completionDialog.waitFor({ timeout: 15000 });
    await expect(completionDialog).toContainText(/Success|submitted|sent|Thank you/i);

    const homeButton = page.getByRole('button', { name: /Home/i });
    if (await homeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('Clicking Home in completion dialog');
      await homeButton.click();
    }

    let workflowId;

    const extractWorkflowIdFromUrl = () => {
      const match = page.url().match(/\/workflow\/([^/?#]+)/i);
      return match ? match[1] : null;
    };

    workflowId = extractWorkflowIdFromUrl();

    if (!workflowId) {
      log('Workflow ID not in current URL, opening latest ordered service details');
      await page.waitForLoadState('networkidle');

      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        await rows.first().click();
        await page.waitForLoadState('networkidle');
        workflowId = extractWorkflowIdFromUrl();
      }
    }

    if (!workflowId) {
      const workflowLink = page.locator('a[href*="/workflow/"]').first();
      if (await workflowLink.count()) {
        await workflowLink.click();
        await page.waitForLoadState('networkidle');
        workflowId = extractWorkflowIdFromUrl();
      }
    }

    expect(workflowId, 'Failed to resolve workflowId from cabinet flow').toBeTruthy();
    log(`Resolved workflowId: ${workflowId}`);

    // 6) Navigate to admin workflow logs.
    log('Navigating to admin workflow journal for resolved workflow ID');
    await page.goto(`http://localhost:8082/workflow/journal/${workflowId}`);

    if (page.url().includes('localhost:8080')) {
      log('Journal page redirected to login, logging in as admin again');
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/admin.p12', 'admin');
      await page.goto(`http://localhost:8082/workflow/journal/${workflowId}`);
    }

    await page.waitForLoadState('networkidle');

    // 7) Observe results.
    const processNotCompletedChip = page.locator('div').filter({ hasText: /^Process not completed$/ }).first();
    await expect(
      processNotCompletedChip,
      'Workflow journal is marked with Process not completed'
    ).not.toBeVisible();

    const processCompleteChip = page.locator('div').filter({ hasText: /^Process complete$/ }).first();
    await expect(
      processCompleteChip,
      'Workflow journal is marked with Process complete'
    ).toBeVisible();

    const unresolvedErrorChip = page.locator('div').filter({ hasText: /^Unresolved error$/ }).first();
    await expect(
      unresolvedErrorChip,
      'Workflow journal is marked with Unresolved error'
    ).not.toBeVisible();

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 15000 });

    const eventRow = rows
      .filter({ hasText: /Send Notification Event|Event 1001001/i })
      .first();
    await expect(eventRow).toBeVisible();

    const errorRow = rows
      .filter({ hasText: /\bError\b|AxiosError|status code 401/i })
      .first();
    await expect(
      errorRow,
      'Workflow journal contains an error entry for notification event'
    ).not.toBeVisible();

    const detailsByRole = eventRow.getByRole('button', { name: /Details/i });
    const detailsByAria = eventRow.locator('button[aria-label="Details"]');

    if (await detailsByRole.isVisible({ timeout: 1000 }).catch(() => false)) {
      await detailsByRole.click();
    } else {
      await detailsByAria.click();
    }

    await expect(page.getByRole('dialog')).toBeVisible();
    log('Workflow journal event details dialog is visible');
  });
});
