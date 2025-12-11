const { debug } = require('./debug');

async function importRegister(page, filePath) {
  debug('importRegister: Navigating to registry page');
  await page.goto('http://localhost:8082/registry');
  debug('importRegister: At registry page');

  const fileChooserPromise = page.waitForEvent('filechooser');
  debug('importRegister: Clicking import button');
  await page.locator('button:has(img[alt="DownloadIcon"])').click();
  debug('importRegister: Import button clicked');

  const fileChooser = await fileChooserPromise;
  debug('importRegister: File chooser opened');
  await fileChooser.setFiles(filePath);
  debug('importRegister: File selected');

  await page.waitForTimeout(500);

  // Click Import in the modal to confirm (if present)
  debug('importRegister: Confirming import in modal');
  const importButton = page.getByRole('button', { name: 'Import' });
  await importButton.waitFor({ timeout: 2000 });
  await importButton.click();
  debug('importRegister: Import confirmed');

  // Close the acknowledge modal
  debug('importRegister: Closing acknowledge modal');
  await page.getByRole('button', { name: 'Close' }).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  debug('importRegister: Modal closed');

  await page.waitForTimeout(500);
}

module.exports = {
  importRegister,
};
