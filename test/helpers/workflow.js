const { debug } = require('./debug');

async function importWorkflow(page, filePath, isTest = false, isOverwrite = false) {
  const url = isTest
    ? 'http://localhost:8082/workflow'
    : 'http://localhost:8082/workflow_test';

  debug('importWorkflow: Navigating to workflows page');
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  debug('importWorkflow: At workflows page');

  const fileChooserPromise = page.waitForEvent('filechooser');
  debug('importWorkflow: Clicking import button');
  await page.locator('button:has(img[alt="import workflow icon"])').click();
  debug('importWorkflow: Import button clicked');

  // Wait for the import confirmation dialog
  await page.getByRole('dialog').waitFor();
  debug('importWorkflow: Import confirmation dialog appeared');

  // Click the Continue button
  await page.getByRole('button', { name: 'Yes' }).click();
  debug('importWorkflow: Clicked Continue in dialog');

  const fileChooser = await fileChooserPromise;
  debug('importWorkflow: File chooser opened');

  // The import is only done once the server accepted it (the first request for an existing
  // workflow is rejected until the overwrite is confirmed). Without waiting for that, a caller
  // navigating away right after a new workflow's import aborts the upload.
  const importAccepted = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && response.url().includes('/bpmn-workflows/import')
      && response.status() < 300,
    { timeout: 60000 },
  );
  importAccepted.catch(() => null);

  await fileChooser.setFiles(filePath);
  debug('importWorkflow: File selected');

  // Wait for the outcome: a success toast (new workflow) or the overwrite dialog (existing one).
  // `isVisible()` doesn't wait, so wait for either of them explicitly.
  const successToast = page.locator('text="Service import completed successfully"');
  const overwriteDialog = page.locator('div[role="dialog"]:has-text("already exists")');
  await successToast.or(overwriteDialog).first().waitFor({ timeout: 30000 });

  if (await successToast.isVisible()) {
    await importAccepted;
    debug('importWorkflow: Success toast appeared, import completed');
    return;
  }

  if (await overwriteDialog.isVisible()) {
    debug('importWorkflow: Overwrite confirmation dialog appeared');
    if (isOverwrite) {
      debug('importWorkflow: Clicking "Yes" to overwrite');
      await overwriteDialog.locator('button[aria-label="Yes"]').click();
      debug('importWorkflow: Clicked "Yes" to overwrite');
    } else {
      throw new Error('Workflow already exists but isOverwrite is false. Add isOverwrite=true to allow overwriting.');
    }
  }

  await importAccepted;
  debug('importWorkflow: Import accepted by the server');

  // Wait for network to be idle to ensure import/overwrite is complete
  await page.waitForLoadState('networkidle');
  debug('importWorkflow: Import complete');
}

module.exports = {
  importWorkflow,
};
