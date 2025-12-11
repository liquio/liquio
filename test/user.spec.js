const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  setupLogging,
  generateTestUser,
  getTraceIdsForRequest,
  log,
  debug,
} = require('./helpers');

test('User can change profile address', async ({ page }) => {
  log('Enabling debug logging');
  await setupLogging(page);

  log('Generating a new test user');
  const testUser = await generateTestUser();
  log(`Generated user: ${testUser.firstName} ${testUser.lastName} (${testUser.serialNumber})`);

  log('Going to portal http://localhost:8081/');
  await page.goto('http://localhost:8081/');

  log('Ensuring redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with generated test user certificate');
  await loginWithPersonalKey(page, testUser.p12Path, testUser.password);

  log('Checking user login success - should be at portal');
  await expect(page).toHaveURL(/^http:\/\/localhost:8081\//);
  await expect(page).not.toHaveURL('http://localhost:8080/');

  log('Navigating to profile page');
  await page.goto('http://localhost:8081/profile');

  log('Checking profile page loaded');
  await expect(page).toHaveURL('http://localhost:8081/profile');

  log('Filling in address field');
  const addressInput = page.locator('input[name="address"]');
  await addressInput.fill('Kyiv region, Kyiv district, Kyiv city, Khreshchatyk street, building 1, apartment 1, postal code 01001');

  log('Clicking Save button');
  await page.getByRole('button', { name: 'Save' }).click();

  log('Waiting for save operation to complete');
  await page.waitForTimeout(2000);

  log('Getting trace IDs for the save request');
  const saveTraceIds = getTraceIdsForRequest('PUT', 'http://localhost:8101/users');
  debug(`Save request trace IDs: ${saveTraceIds.join(', ')}`);

  log('Reloading profile page to verify address was saved');
  await page.reload();

  log('Checking profile page loaded after reload');
  await expect(page).toHaveURL('http://localhost:8081/profile');

  log('Verifying address field still contains the saved value');
  const addressInputAfterReload = page.locator('input[name="address"]');
  await expect(addressInputAfterReload).toHaveValue('Kyiv region, Kyiv district, Kyiv city, Khreshchatyk street, building 1, apartment 1, postal code 01001');

  log('Logging out via Exit menu item');
  await page.getByRole('menuitem', { name: 'Exit' }).click();

  log('Ensuring that we\'ve been redirected to login page after logout');
  await ensureAtLoginPage(page);
});
