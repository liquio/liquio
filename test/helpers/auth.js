const { expect } = require('@playwright/test');
const { debug } = require('./debug');

async function ensureAtLoginPage(page) {
  debug('ensureAtLoginPage: Make sure we are at the login page http://localhost:8080/');
  await expect(page).toHaveURL('http://localhost:8080/');
  debug('ensureAtLoginPage: At login page');

  debug('ensureAtLoginPage: Checking personal key button is visible');
  await expect(
    page.getByRole('button', { name: 'Personal key' })
  ).toBeVisible();
  debug('ensureAtLoginPage: Personal key button visible');
}

async function loginWithPersonalKey(page, filePath, password) {
  debug('loginWithPersonalKey: Make sure we are at the login page http://localhost:8080/');
  await expect(page).toHaveURL('http://localhost:8080/');
  debug('loginWithPersonalKey: At login page');

  debug('loginWithPersonalKey: Clicking "Personal key" button');
  await page.getByRole('button', { name: 'Personal key' }).click();
  debug('loginWithPersonalKey: Button clicked');

  debug('loginWithPersonalKey: Uploading admin file');
  await page.locator('input[type="file"]').setInputFiles(filePath);
  debug('loginWithPersonalKey: File uploaded');

  debug('loginWithPersonalKey: Entering admin password');
  await page.locator('input[type="password"]').fill(password);
  debug('loginWithPersonalKey: Password entered');

  debug('loginWithPersonalKey: Clicking "Continue"');
  await page.getByRole('button', { name: 'Continue' }).click();
  debug('loginWithPersonalKey: Button clicked');

  debug('loginWithPersonalKey: Waiting for x509 authorization request (with 100s timeout)');
  await page.waitForResponse('http://localhost:8080/authorise/x509', { timeout: 100000 });
  debug('loginWithPersonalKey: X509 authorization completed');
}

module.exports = {
  ensureAtLoginPage,
  loginWithPersonalKey,
};
