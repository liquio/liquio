const { debug } = require('./debug');

const CABINET_API_URL = 'http://localhost:8101';

/**
 * Creates a cabinet API client that acts as the user logged in on `page` (it reuses the
 * cabinet's `token` from localStorage). Lets tests send payloads the UI never would -
 * e.g. tampered calcTrigger results - the same way a user could via devtools.
 * @param {import('@playwright/test').Page} page Page with a logged-in cabinet (http://localhost:8081).
 * @returns {Promise<object>} Cabinet API client.
 */
async function createCabinetApi(page) {
  debug('createCabinetApi: Waiting for cabinet token in localStorage');
  await page.waitForFunction(() => !!localStorage.getItem('token'));
  const token = await page.evaluate(() => localStorage.getItem('token'));
  debug('createCabinetApi: Token found');

  const request = async (method, path, data) => {
    debug(`createCabinetApi: ${method} ${path} ${data ? JSON.stringify(data) : ''}`);
    const response = await page.request.fetch(`${CABINET_API_URL}/${path}`, {
      method,
      headers: { token },
      data,
      failOnStatusCode: false,
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    debug(`createCabinetApi: ${method} ${path} -> ${response.status()} ${text.slice(0, 500)}`);

    return { status: response.status(), body };
  };

  return {
    createTask: (workflowTemplateId, taskTemplateId) => request('POST', 'tasks', { workflowTemplateId, taskTemplateId }),
    getTask: (taskId) => request('GET', `tasks/${taskId}`),
    getDocument: (documentId) => request('GET', `documents/${documentId}`),
    updateDocument: (documentId, properties, triggerPath) => request(
      'PUT',
      `documents/${documentId}`,
      typeof triggerPath === 'undefined' ? { properties } : { properties, triggerPath },
    ),
    validateDocument: (documentId, { commit = false } = {}) => request('POST', `documents/${documentId}/validate?commit=${commit}`, {}),
    commitTask: (taskId) => request('POST', `tasks/${taskId}/commit`, {}),
  };
}

module.exports = {
  createCabinetApi,
};
