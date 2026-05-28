const { test, expect } = require('@playwright/test');

const {
  ensureAtLoginPage,
  loginWithPersonalKey,
  setupLogging,
  log,
} = require('./helpers');

const HELLO_WORLD_HTML = [
  '<!DOCTYPE html>',
  '<html>',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <title>Hello World</title>',
  '</head>',
  '<body>',
  '  <h1>Hello, World!</h1>',
  '</body>',
  '</html>',
].join('\n');

test.describe('Message Template CRUD', () => {
  test('create a message template with HTML body', async ({ page }) => {
    await setupLogging(page);
    page.setDefaultTimeout(10000);

    const templateTitle = `test-${Date.now()}`;

    // 1) Login as admin.
    log('Navigating to admin panel');
    await page.goto('http://localhost:8082/');
    await ensureAtLoginPage(page);
    log('Logging in as admin with personal key');
    await loginWithPersonalKey(page, '../config/admin.p12', 'admin');
    await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);

    // 2) Navigate to Message Templates page.
    log('Navigating to /workflow/message-templates');
    await page.goto('http://localhost:8082/workflow/message-templates');
    await expect(page).toHaveTitle(/Message Templates/i);

    // 3) Open Create Template dialog.
    log('Clicking Add New');
    const addNewButton = page.getByRole('button', { name: /Add New/i });
    await addNewButton.waitFor({ timeout: 5000 });
    await addNewButton.click();

    const createDialog = page.getByRole('dialog', { name: /Create Template/i });
    await createDialog.waitFor({ timeout: 5000 });
    log('Create Template dialog opened');

    // 5) Fill in the Title field.
    log('Filling in Title');
    const titleInput = createDialog.getByRole('textbox', { name: /Title/i });
    await titleInput.fill(templateTitle);

    // 6) Open the Edit HTML editor.
    log('Clicking Edit HTML');
    const editHtmlButton = createDialog.getByRole('button', { name: /Edit HTML/i });
    await editHtmlButton.click();

    // The Edit HTML dialog has no accessible name — locate by its heading text.
    const htmlDialog = page.locator('[role="dialog"]').filter({
      has: page.getByRole('heading', { name: /Edit HTML/i }),
    });
    await htmlDialog.waitFor({ timeout: 10000 });
    log('Edit HTML dialog opened');

    // 6) Type HTML into the Monaco editor.
    log('Typing HTML into Monaco editor');
    await page.locator('.monaco-editor .view-lines').first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(HELLO_WORLD_HTML);

    // Verify at least one line rendered in the editor.
    await expect(page.locator('.monaco-editor .view-line').first()).toBeVisible();

    // 7) Close the HTML editor.
    log('Closing Edit HTML dialog');
    const closeEditorButton = htmlDialog.locator('button').last();
    await closeEditorButton.click();
    await expect(htmlDialog).toBeHidden({ timeout: 5000 });

    // 9) Save the template.
    log('Clicking Save');
    const saveButton = createDialog.getByRole('button', { name: /Save/i });
    await saveButton.click();

    // 10) Verify dialog closed and row appeared in the table.
    log('Verifying template row appears in table');
    await expect(createDialog).toBeHidden({ timeout: 5000 });

    const tableRow = page.locator('table tbody tr').filter({ hasText: templateTitle });
    await expect(tableRow).toBeVisible({ timeout: 5000 });
    await expect(tableRow).toContainText('sms');
    await expect(tableRow).toContainText(templateTitle);

    log('Message template created successfully');

    // 11) Edit the template — update the title.
    const editedTitle = `${templateTitle}-edited`;
    log('Editing created template');
    await tableRow.hover();
    await tableRow.getByRole('button', { name: /Edit/i }).click();

    const editDialog = page.getByRole('dialog');
    await editDialog.waitFor({ timeout: 5000 });
    log('Edit dialog opened');

    const editTitleInput = editDialog.getByRole('textbox', { name: /Title/i });
    await editTitleInput.fill(editedTitle);

    const editSaveButton = editDialog.getByRole('button', { name: /Save/i });
    await editSaveButton.click();
    await expect(editDialog).toBeHidden({ timeout: 5000 });

    const editedRow = page.locator('table tbody tr').filter({ hasText: editedTitle });
    await expect(editedRow).toBeVisible({ timeout: 5000 });
    await expect(editedRow).toContainText(editedTitle);
    log('Template edited successfully');

    // 12) Clean up — delete the edited template.
    log('Deleting edited template');
    await editedRow.hover();
    await editedRow.getByRole('button', { name: /Delete/i }).click();
    const confirmDialog = page.getByRole('dialog');
    const confirmOk = confirmDialog.getByRole('button', { name: /Yes|OK|Confirm|Delete/i });
    if (await confirmOk.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmOk.click();
    }
    await expect(editedRow).toBeHidden({ timeout: 5000 });
    log('Template deleted successfully');
  });
});
