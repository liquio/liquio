const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importRegister,
  importWorkflow,
  setupLogging,
  log,
} = require('./helpers');

test('Authorize with admin and import register/workflow', async ({ page }) => {
  await setupLogging(page);

  log('Going to http://localhost:8082/');
  await page.goto('http://localhost:8082/');

  log('Ensuring that we\'ve been redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with personal key (admin.p12)');
  await loginWithPersonalKey(page, '../config/admin.p12', 'admin');

  log('Checking admin login success');
  await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);
  await expect(page).not.toHaveURL('http://localhost:8080/');

  {
    log('Importing register keys 100, 101, 102');
    await importRegister(page, '../examples/register-100-100.dat');
    await importRegister(page, '../examples/register-100-101.dat');
    await importRegister(page, '../examples/register-100-102.dat');

    log('Verifying imported register keys');
    await page.goto('http://localhost:8082/registry/100');

    // Check that the registry table has exactly three rows (one for each imported register key)
    await expect(page.locator('tbody tr')).toHaveCount(3);

    // Additionally, verify the specific register keys are present in the descriptions
    await expect(
      page
        .locator('tbody')
        .getByText(
          'Students. This register contains information about students'
        )
    ).toBeVisible();
    await expect(
      page
        .locator('tbody')
        .getByText(
          'Institutions. This register contains information about educational institutions'
        )
    ).toBeVisible();
    await expect(
      page
        .locator('tbody')
        .getByText(
          'Groups. This register contains information about educational groups'
        )
    ).toBeVisible();
  }

  {
    log('Importing workflow 1000');
    await importWorkflow(page, '../examples/workflow-1000.bpmn');

    log('Verifying the imported workflow');
    await page.goto('http://localhost:8082/workflow/1000');
    await expect(page).toHaveTitle(/^Student editing/);
  }
});

test('Authorize with end user and pass the workflow', async ({ page }) => {
  await setupLogging(page);

  log('Going to http://localhost:8081/');
  await page.goto('http://localhost:8081/');

  log('Ensuring that we\'ve been redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with personal key (demo.p12)');
  await loginWithPersonalKey(page, '../config/demo.p12', 'demo');

  log('Waiting for auth/me request');
  await page.waitForResponse('http://localhost:8101/auth/me');

  log('Checking URL is http://localhost:8081/messages');
  await expect(page).toHaveURL('http://localhost:8081/messages');

  {
    log('Navigating to order services page');
    await page.getByRole('button', { name: 'Order service' }).click();

    log('Clicking on Test Process');
    await page.getByText('Test Process').click();

    log('Clicking on Student editing task');
    await page.locator('a[href="/tasks/create/1000/1000001"]').click();

    log('Verifying page title changed to Student editing task');
    await expect(page).toHaveTitle(/^Student editing: Educational institution/);

    log('Verify that we\'re at the instituionInfo step');
    await expect(page).toHaveURL(
      /^http:\/\/localhost:8081\/tasks\/[a-f0-9-]{36}\/institutionInfo$/
    );

    log('Clicking on Educational institution control');
    await page.getByRole('button', { name: 'Open list' }).click();

    log('Selecting Kyiv Polytechnic Institute from dropdown');
    await page.getByText(/^Kyiv Polytechnic Institute/).click();

    log('Clicking on Group control');
    await page.getByRole('button', { name: 'Open list' }).nth(1).click();

    log('Selecting Computer Science A from dropdown');
    await page.getByText(/^Computer Science A/).click();

    log('Waiting for form to activate');
    await page.waitForTimeout(2000);

    log('Clicking Continue button');
    await page.locator('#next-step-button').click();

    log('Waiting for the next step');
    await page.waitForTimeout(2000);

    log('Verify that we\'re at the studentInfo step');
    await expect(page).toHaveURL(
      /^http:\/\/localhost:8081\/tasks\/[a-f0-9-]{36}\/studentInfo$/
    );
  }
});
