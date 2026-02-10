const { debug } = require('./debug');

async function importWorkflow(page, filePath, isTest = false, isOverwrite = false) {
  const url = isTest
    ? 'http://localhost:8082/workflow'
    : 'http://localhost:8082/workflow_test';

  debug('importWorkflow: Navigating to workflows page');
  await page.goto(url);
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
  await fileChooser.setFiles(filePath);
  debug('importWorkflow: File selected');

  // Wait for network to be idle before checking for dialogs
  await page.waitForLoadState('networkidle');

  // Check for success toast first
  const successToast = page.locator('text="Service import completed successfully"');
  const hasSuccessToast = await successToast.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (hasSuccessToast) {
    debug('importWorkflow: Success toast appeared, import completed');
    return;
  }
  // Check if overwrite dialog appears
  const overwriteDialog = page.locator('div[role="dialog"]:has-text("already exists")');
  const isOverwriteDialogVisible = await overwriteDialog.isVisible({ timeout: 1000 }).catch(() => false);

  if (isOverwriteDialogVisible) {
    debug('importWorkflow: Overwrite confirmation dialog appeared');
    if (isOverwrite) {
      debug('importWorkflow: Clicking "Yes" to overwrite');
      await overwriteDialog.locator('button[aria-label="Yes"]').click();
      debug('importWorkflow: Clicked "Yes" to overwrite');
    } else {
      throw new Error('Workflow already exists but isOverwrite is false. Add isOverwrite=true to allow overwriting.');
    }
  }

  // Wait for network to be idle to ensure import/overwrite is complete
  await page.waitForLoadState('networkidle');
  debug('importWorkflow: Import complete');
}

module.exports = {
  importWorkflow,
};
