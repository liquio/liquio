const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  setupLogging,
  log,
  debug,
} = require('./helpers');

test('Admin can login to admin panel (8082)', async ({ page }) => {
  await setupLogging(page);

  log('Going to admin panel http://localhost:8082/');
  await page.goto('http://localhost:8082/');

  log('Ensuring redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with admin.p12');
  await loginWithPersonalKey(page, '../config/admin.p12', 'admin');

  log('Checking admin login success - should be at admin panel');
  await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);
  await expect(page).not.toHaveURL('http://localhost:8080/');
});

test('Demo can login to portal (8081)', async ({ page }) => {
  await setupLogging(page);

  log('Going to portal http://localhost:8081/');
  await page.goto('http://localhost:8081/');

  log('Ensuring redirected to login page');
  await ensureAtLoginPage(page);

  log('Logging in with demo.p12');
  await loginWithPersonalKey(page, '../config/demo.p12', 'demo');

  log('Checking demo login success - should be at portal');
  await expect(page).toHaveURL(/^http:\/\/localhost:8081\//);
  await expect(page).not.toHaveURL('http://localhost:8080/');
});

test('Demo cannot login to admin panel (8082)', async ({ page }) => {
  await setupLogging(page);

  log('Going to admin panel http://localhost:8082/ with demo credentials');
  await page.goto('http://localhost:8082/');

  log('Ensuring redirected to login page');
  await ensureAtLoginPage(page);

  log('Attempting to login with demo.p12 to admin panel');
  await loginWithPersonalKey(page, '../config/demo.p12', 'demo');

  log('Checking that demo cannot access admin panel - should get 403 on auth/me');
  // Wait for the auth/me request and check its response
  const authMeResponse = await page.waitForResponse('**/auth/me');
  expect(authMeResponse.status()).toBe(403);

  log('Capturing what user sees on admin panel after failed auth');
  const pageContent = await page.textContent('body');
  debug(`Page content after failed demo login: ${pageContent.substring(0, 500)}...`);

  // Check if there's an authorization error message
  const hasAuthError = pageContent.includes('not authorized') || pageContent.includes('not allowed') || 
                      pageContent.includes('access denied') || pageContent.includes('forbidden');
  debug(`Page contains authorization error: ${hasAuthError}`);
  expect(hasAuthError).toBe(true);

  // The URL might still be 8082 but the content should show access denied
  await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);
});
