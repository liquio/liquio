const { debug } = require('./debug');

async function importWorkflow(page, filePath, isTest = false) {
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
}

module.exports = {
  importWorkflow,
};
