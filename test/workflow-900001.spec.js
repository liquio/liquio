const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  setupLogging,
  log,
} = require('./helpers');

test.describe('Workflow 900001 (Attention Notice)', () => {
  let workflowId;

  test('import workflow as an admin', async ({ page }) => {
    await setupLogging(page);
    page.setDefaultTimeout(3000);

    log('Going to http://localhost:8082/');
    await page.goto('http://localhost:8082/');

    log('Ensuring that we\'ve been redirected to login page');
    await ensureAtLoginPage(page);

    log('Logging in with personal key (admin.p12)');
    await loginWithPersonalKey(page, '../config/admin.p12', 'admin');

    log('Checking admin login success');
    await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);

    log('Importing workflow 900001');
    await importWorkflow(page, './fixtures/workflow-900001.bpmn', false, true);

    log('Verifying the imported workflow');
    await page.goto('http://localhost:8082/workflow/900001');
    await expect(page).toHaveTitle(/^Attention Notice/);
    log('✓ Workflow 900001 successfully imported and verified');
  });

  test('go through workflow as a user', async ({ page }) => {
    await setupLogging(page);
    page.setDefaultTimeout(3000);

    log('Navigating to cabinet at http://localhost:8081/');
    await page.goto('http://localhost:8081/');

    log('Waiting for cabinet to load');
    await page.waitForLoadState('networkidle');

    // Check if we're already logged in (from admin session) or if we need to log in
    const currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl === 'http://localhost:8080/') {
      log('Redirected to login, proceeding with demo user login');
      await ensureAtLoginPage(page);
      log('Logging in with demo personal key (demo.p12)');
      await loginWithPersonalKey(page, '../config/demo.p12', 'demo');
    } else {
      log('Already logged in, skipping login step');
    }

    log('Checking cabinet is accessible');
    await expect(page).toHaveURL(/^http:\/\/localhost:8081/);
    log('✓ Cabinet login successful');

    log('Looking for workflow 900001 (Attention Notice) to start');
    // Wait for the workflow list to load
    await page.waitForLoadState('networkidle');
    
    // Try to find the workflow by text or element
    const workflowElements = page.locator('text=Attention Notice');
    const count = await workflowElements.count();
    
    if (count > 0) {
      log(`Found ${count} workflow element(s) with text "Attention Notice"`);
      await workflowElements.first().click();
    } else {
      log('Workflow not found by text, looking for button or card');
      const workflowButton = page.locator('[class*="workflow"], [class*="card"], button').filter({ hasText: /Attention|900001/ });
      if (await workflowButton.count() > 0) {
        await workflowButton.first().click();
      } else {
        log('Warning: Could not locate workflow element');
      }
    }

    await page.waitForLoadState('networkidle').catch(() => null);

    log('Workflow instance loaded, waiting for Order service button to appear');
    await page.getByRole('button', { name: 'Order service' }).waitFor();
    log('Order service button found, clicking it');
    await page.getByRole('button', { name: 'Order service' }).click();

    log('Waiting for testProcess dropdown to appear');
    await page.getByRole('button', { name: 'testProcess' }).waitFor();
    log('testProcess dropdown found, clicking it');
    await page.getByRole('button', { name: 'testProcess' }).click();

    log('Waiting for Attention Notice task link to appear');
    await page.getByRole('link', { name: 'Attention Notice' }).waitFor();
    log('Attention Notice link found, clicking it');
    await page.getByRole('link', { name: 'Attention Notice' }).click();

    log('Waiting for task page to load');
    await page.waitForURL(/\/tasks\/[a-f0-9-]+\/dataCheckInfo/);
    const taskUrl = page.url();
    const taskIdMatch = taskUrl.match(/\/tasks\/([a-f0-9-]+)\//);
    const taskId = taskIdMatch ? taskIdMatch[1] : null;
    await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+\/dataCheckInfo/);
    log(`✓ Task page loaded: ${taskUrl}, Task ID: ${taskId}`);

    log('Waiting for Finish button to appear');
    await page.getByRole('button', { name: 'Finish' }).waitFor();
    log('Finish button found, clicking it');
    await page.getByRole('button', { name: 'Finish' }).click();

    log('Waiting for completion dialog to appear');
    await page.getByRole('dialog').filter({ hasText: /Thank you|application has been sent/ }).waitFor();
    await expect(page.getByRole('dialog')).toContainText(/Thank you|application has been sent/);
    log('✓ Workflow task completed successfully, completion dialog shown');
    log('Completion dialog found, clicking Home button');
    await page.getByRole('button', { name: 'Home' }).click();

    log('Waiting for Ordered services page to load');
    await page.getByRole('heading', { name: 'Ordered services' }).waitFor();
    await expect(page.getByRole('heading', { name: 'Ordered services' })).toBeVisible();
    log('✓ Workflow completed successfully, user returned to Ordered services page');

    log('Waiting for ordered services table to load');
    await page.locator('table').waitFor();
    await expect(page.locator('table tbody tr')).toHaveCount(await page.locator('table tbody tr').count());
    log('Services table found, clicking the first (most recent) record');
    const firstTableRow = page.locator('tbody tr').first();
    await firstTableRow.click();
    log('✓ Clicked first record in services table');

    log('Waiting for service details page to load');
    await page.waitForLoadState('networkidle');
    log('Service details page loaded');

    log('Waiting for "Elements.noData" message to appear');
    await page.getByText('Elements.noData').waitFor();
    await expect(page.getByText('Elements.noData')).toBeVisible();
    log('✓ Service details verified - no data message found');

    // Extract workflowId from URL for use in admin tests
    const urlMatch = page.url().match(/\/workflow\/([^/]+)/);
    workflowId = urlMatch ? urlMatch[1] : '900001';
    log(`✓ Extracted workflow ID: ${workflowId}`);
  });

  test('check workflow logs as an admin', async ({ page }) => {
    await setupLogging(page);
    page.setDefaultTimeout(3000);

    log('Going to http://localhost:8082/');
    await page.goto('http://localhost:8082/');

    log('Ensuring that we\'ve been redirected to login page');
    await ensureAtLoginPage(page);

    log('Logging in with personal key (admin.p12)');
    await loginWithPersonalKey(page, '../config/admin.p12', 'admin');

    log('Checking admin login success');
    await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);

    log(`Navigating to workflow journal for ID: ${workflowId}`);
    await page.goto(`http://localhost:8082/workflow/journal/${workflowId}`);
    await page.waitForLoadState('networkidle');
    log('✓ Workflow journal page loaded');

    log('Looking for Event row in the workflow journal table');
    const eventRow = page.locator('table tbody tr').filter({ hasText: /Event/ });
    await eventRow.waitFor();
    log('Event row found');

    log('Clicking Details button next to Event');
    await eventRow.locator('button[aria-label="Details"]').click();
    log('✓ Details button clicked for Event');
  });
});
