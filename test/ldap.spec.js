// LDAP login: API and UI checks of one feature in one spec.
//
// Needs the LDAP stack (an OpenLDAP container and the `ldap` provider enabled in id-api), see
// fixtures/ldap/docker-compose.ldap.yml. When id-api does not offer the `ldap` login the whole file is skipped.
//
// Start the stack from the repository root:
//   docker compose -f docker-compose.yml -f test/fixtures/ldap/docker-compose.ldap.yml up -d openldap id-api
// Run in `test/`:
//   npx playwright test ldap.spec.js
//
// The directory is changed through `docker compose exec openldap ldapmodify` (see helpers/ldap.js).
// Users (see fixtures/ldap/directory.ldif):
//   alice - access group member, used for the plain login checks
//   bob   - exists in the directory but is not in the access group
//   dave  - access group member, removed from and added back to the group by the revocation checks
//   erin  - member of the access group and of the unit group, used for the unit mapping check

const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  setupLogging,
  log,
  ID_API_URL,
  ACCESS_GROUP,
  UNIT_GROUP,
  seedDirectory,
  addToGroup,
  removeFromGroup,
  resetLoginAttempts,
  psql,
  isLdapProviderEnabled,
  loginWithLdapApi,
  getIdSession,
  syncLdapUser,
} = require('./helpers');

const CABINET_URL = 'http://localhost:8081/';
const GENERIC_ERROR = 'Invalid login or password. Please try again.';
const GENERIC_API_ERROR = 'Invalid login or password.';
const LDAP_UNIT_ID = 990781;

const getUserIdByEmail = (email) => psql(`SELECT "userId" FROM users WHERE email = '${email}'`, 'id');

async function openLdapForm(page) {
  await page.goto(CABINET_URL);
  await ensureAtLoginPage(page);
  await page.getByRole('button', { name: /directory account/i }).click();
}

async function submitLdapForm(page, username, password) {
  await page.getByRole('textbox', { name: /Username/ }).fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

async function loginWithLdapUi(page, username, password) {
  await openLdapForm(page);
  await submitLdapForm(page, username, password);
}

test.describe('LDAP login', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    const isEnabled = await isLdapProviderEnabled(request);
    test.skip(!isEnabled, 'The ldap provider is not enabled in id-api. Start the stack with test/fixtures/ldap/docker-compose.ldap.yml.');

    seedDirectory();
    resetLoginAttempts();
  });

  test.afterAll(async () => {
    try {
      addToGroup('dave', ACCESS_GROUP);
      psql(`DELETE FROM units WHERE id = ${LDAP_UNIT_ID}`);
    } catch (error) {
      log(`Cleanup failed: ${error.message}`);
    }
  });

  test('API: id-api lists the ldap login option', async ({ request }) => {
    const response = await request.get(`${ID_API_URL}/auth_providers`);
    expect(response.status()).toBe(200);

    const { providers } = await response.json();
    expect(providers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'ldap', id: 'ldap' })]));
  });

  test('UI: login page shows the LDAP button', async ({ page }) => {
    await setupLogging(page);

    await page.goto(CABINET_URL);
    await ensureAtLoginPage(page);

    await expect(page.getByRole('button', { name: /directory account/i })).toBeVisible();
  });

  test('UI: LDAP form has a Username field and no change-password control', async ({ page }) => {
    await setupLogging(page);

    await openLdapForm(page);

    await expect(page.getByRole('textbox', { name: /Username/ })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Email/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Change password' })).toHaveCount(0);
  });

  test('API: wrong password is rejected with 401', async ({ request }) => {
    const { response } = await loginWithLdapApi(request, 'alice', 'wrong-password');

    expect(response.status()).toBe(401);
    expect(JSON.stringify(await response.json())).toContain(GENERIC_API_ERROR);
  });

  test('API: a user outside of the access group gets the same 401 as a wrong password', async ({ request }) => {
    const wrongPassword = await loginWithLdapApi(request, 'alice', 'wrong-password');
    const notInGroup = await loginWithLdapApi(request, 'bob', 'bobpw');

    expect(notInGroup.response.status()).toBe(401);
    expect(await notInGroup.response.json()).toEqual(await wrongPassword.response.json());
  });

  test('API: an unknown user gets the same 401 as a wrong password', async ({ request }) => {
    const { response } = await loginWithLdapApi(request, 'nobody', 'whatever');

    expect(response.status()).toBe(401);
    expect(JSON.stringify(await response.json())).toContain(GENERIC_API_ERROR);
  });

  test('UI: wrong password shows the generic error message', async ({ page }) => {
    await setupLogging(page);

    await loginWithLdapUi(page, 'alice', 'wrong-password');

    await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
    await expect(page).toHaveURL('http://localhost:8080/');
  });

  test('UI: a user outside of the access group shows the same generic error message', async ({ page }) => {
    await setupLogging(page);

    await loginWithLdapUi(page, 'bob', 'bobpw');

    await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
    await expect(page).toHaveURL('http://localhost:8080/');
  });

  test('API: successful login opens a session of an ldap user', async ({ request }) => {
    const { response, cookie } = await loginWithLdapApi(request, 'alice', 'alicepw');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ error: null, redirect: '/authorise/continue/' });

    const session = await getIdSession(request, cookie);
    expect(session.status).toBe(200);
    expect(session.body).toMatchObject({ provider: 'ldap' });
  });

  test('UI: successful login lands in the cabinet', async ({ page }) => {
    await setupLogging(page);

    await loginWithLdapUi(page, 'alice', 'alicepw');

    await expect(page).toHaveURL(/^http:\/\/localhost:8081\//, { timeout: 30000 });
    await expect(page).not.toHaveURL('http://localhost:8080/');
  });

  test('API: the sync endpoint requires Basic auth', async ({ request }) => {
    const response = await request.post(`${ID_API_URL}/user/ldap/sync/${getUserIdByEmail('alice.ldap@example.org')}`, { failOnStatusCode: false });

    expect(response.status()).toBe(401);
  });

  test('API: the sync reports a user who still has access as unchanged', async () => {
    const { status, body } = await syncLdapUser(getUserIdByEmail('alice.ldap@example.org'));

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'unchanged' });
  });

  test('API: removing a user from the access group revokes the session, and adding back restores the login', async ({ request }) => {
    addToGroup('dave', ACCESS_GROUP);
    const { response, cookie } = await loginWithLdapApi(request, 'dave', 'davepw');
    expect(response.status()).toBe(200);
    expect((await getIdSession(request, cookie)).body).toMatchObject({ provider: 'ldap' });
    const userId = getUserIdByEmail('dave.ldap@example.org');

    removeFromGroup('dave', ACCESS_GROUP);
    const sync = await syncLdapUser(userId);
    expect(sync.status).toBe(200);
    expect(sync.body).toMatchObject({ status: 'revoked' });

    // id-api answers /auth without a valid session with an empty object.
    expect((await getIdSession(request, cookie)).body).toEqual({});

    const rejected = await loginWithLdapApi(request, 'dave', 'davepw');
    expect(rejected.response.status()).toBe(401);

    addToGroup('dave', ACCESS_GROUP);
    const restored = await loginWithLdapApi(request, 'dave', 'davepw');
    expect(restored.response.status()).toBe(200);
    expect((await getIdSession(request, restored.cookie)).body).toMatchObject({ provider: 'ldap' });
  });

  test('UI: a user removed from the access group is sent to the login page and can log in again after being added back', async ({ page }) => {
    await setupLogging(page);
    addToGroup('dave', ACCESS_GROUP);

    await loginWithLdapUi(page, 'dave', 'davepw');
    await expect(page).toHaveURL(/^http:\/\/localhost:8081\//, { timeout: 30000 });
    const userId = getUserIdByEmail('dave.ldap@example.org');

    removeFromGroup('dave', ACCESS_GROUP);
    const sync = await syncLdapUser(userId);
    expect(sync.body).toMatchObject({ status: 'revoked' });

    await page.reload();
    await expect(page).toHaveURL(/^http:\/\/localhost:8080\//, { timeout: 30000 });

    await loginWithLdapUi(page, 'dave', 'davepw');
    await expect(page.getByText(GENERIC_ERROR)).toBeVisible();

    addToGroup('dave', ACCESS_GROUP);
    await loginWithLdapUi(page, 'dave', 'davepw');
    await expect(page).toHaveURL(/^http:\/\/localhost:8081\//, { timeout: 30000 });
  });

  test('UI: a unit with member groups gets the user as a member after login', async ({ page }) => {
    await setupLogging(page);
    psql('DELETE FROM units WHERE id = ' + LDAP_UNIT_ID);
    psql(
      'INSERT INTO units (id, name, description, data, created_at, updated_at) VALUES ('
      + `${LDAP_UNIT_ID}, 'LDAP test unit', 'LDAP test unit', '${JSON.stringify({ ldap: { memberGroups: [UNIT_GROUP] } })}', now(), now())`,
    );

    await loginWithLdapUi(page, 'erin', 'erinpw');
    await expect(page).toHaveURL(/^http:\/\/localhost:8081\//, { timeout: 30000 });

    const userId = getUserIdByEmail('erin.ldap@example.org');
    await expect.poll(() => psql(`SELECT members FROM units WHERE id = ${LDAP_UNIT_ID}`), { timeout: 30000 }).toContain(userId);
  });
});
