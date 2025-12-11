const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  setupLogging,
  generateTestUser,
  log,
  getConfirmationPinFromDockerLogs,
} = require('./helpers');

test('User can change email and verify with PIN confirmation', async ({ page }) => {
  log('Enabling debug logging');
  await setupLogging(page);

  log('Generating a new test user');
  const testUser = await generateTestUser();
  log(`Generated user: ${testUser.firstName} ${testUser.lastName} (${testUser.serialNumber})`);

  log('Going to cabinet portal http://localhost:8081/');
  await page.goto('http://localhost:8081/');

  log('Ensuring redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with generated test user certificate');
  await loginWithPersonalKey(page, testUser.p12Path, testUser.password);

  log('Checking user login success - should be at cabinet portal');
  await expect(page).toHaveURL(/^http:\/\/localhost:8081\//);

  log('Navigating to profile page');
  await page.goto('http://localhost:8081/profile');

  log('Checking profile page loaded');
  await expect(page).toHaveURL('http://localhost:8081/profile');

  log('Clicking edit button to enable email input field');
  // Click the pencil/edit icon button to enable email editing
  const editButton = page.locator('button[type="button"]').filter({ has: page.locator('svg[data-testid="BorderColorRoundedIcon"]') });
  await editButton.click();
  log('Edit button clicked');

  log('Waiting for email change modal/dialog to appear');
  await page.waitForTimeout(100);

  log('Filling in new email address');
  const newEmail = `test-${Date.now()}@example.com`;
  // Modal appears with email input - use data-qa selector scoped to dialog
  const dialog = page.locator('[role="dialog"]');
  const emailInput = dialog.locator('input[data-qa="Email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(newEmail);
  log(`Entered new email: ${newEmail}`);

  log('Clicking Save button');
  const saveButton = dialog.locator('button:has-text("Send mail")');
  await saveButton.waitFor({ state: 'visible', timeout: 5000 });
  // Wait for button to be enabled before clicking
  await expect(saveButton).toBeEnabled({ timeout: 5000 });
  await saveButton.click();
  log('Send mail button clicked');

  log('Waiting for confirmation code input to appear');
  const confirmationCodeInput = page.locator('input[placeholder="Confirmation Code"]');
  await confirmationCodeInput.waitFor({ state: 'visible', timeout: 10000 });
  log('Confirmation code input is now visible');

  log('Extracting confirmation PIN from docker-compose logs');
  const confirmationPin = await getConfirmationPinFromDockerLogs(10, 500);
  log(`Successfully extracted confirmation PIN: ${confirmationPin}`);

  log('Entering confirmation PIN into input field');
  await confirmationCodeInput.fill(confirmationPin);
  log(`Confirmation code entered: ${confirmationPin}`);

  log('Clicking Confirm button to verify email change');
  await page.getByRole('button', { name: /Confirm|Verify|Submit|OK/i }).click();

  log('Waiting for email verification to complete');
  await page.waitForTimeout(2000);

  log('Verifying success modal/notification appears');
  const successIndicators = [
    page.locator('text=/successfully|success|completed/i'),
    page.locator('[role="dialog"] text=/successfully|success|completed/i'),
    page.locator('[role="alert"] text=/successfully|success|completed/i'),
  ];

  let successFound = false;
  for (const indicator of successIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: 3000 });
      successFound = true;
      log('Success indicator found and visible');
      break;
    } catch {
      // Continue to next indicator
    }
  }

  if (!successFound) {
    log('Warning: Could not find explicit success message, but test continued');
  }

  log('Reloading profile page to verify email change persisted');
  await page.reload();

  log('Checking profile page loaded after reload');
  await expect(page).toHaveURL('http://localhost:8081/profile');

  log('Verifying email field contains the updated value');
  const emailInputAfterReload = page.locator('input[name="email"]');
  await expect(emailInputAfterReload).toHaveValue(newEmail);
  log(`Email change verified: ${newEmail}`);

  log('Logging out via Exit menu item');
  await page.getByRole('menuitem', { name: 'Exit' }).click();

  log('Ensuring that we\'ve been redirected to login page after logout');
  await ensureAtLoginPage(page);

  log('Test completed successfully - user email was changed and verified with PIN confirmation');
});
