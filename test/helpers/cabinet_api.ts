import type { Page } from '@playwright/test';
import { debug } from './debug';

const CABINET_API_URL = 'http://localhost:8101';

export interface CabinetApiResponse {
  status: number;
  body: any; // parsed JSON, or the text when the body is not JSON
  buffer: Buffer;
}

/**
 * Creates a cabinet API client that acts as the user logged in on `page` (it reuses the
 * cabinet's `token` from localStorage). Lets tests send payloads the UI never would -
 * e.g. tampered calcTrigger results - the same way a user could via devtools.
 * @param page Page with a logged-in cabinet (http://localhost:8081).
 * @returns Cabinet API client; each call resolves to `{ status, body, buffer }`, where `buffer` is the raw response body.
 */
async function createCabinetApi(page: Page) {
  debug('createCabinetApi: Waiting for cabinet token in localStorage');
  await page.waitForFunction(() => !!localStorage.getItem('token'));
  const token = await page.evaluate(() => localStorage.getItem('token'));
  debug('createCabinetApi: Token found');

  const request = async (method: string, path: string, data?: unknown): Promise<CabinetApiResponse> => {
    debug(`createCabinetApi: ${method} ${path} ${data ? JSON.stringify(data) : ''}`);
    const response = await page.request.fetch(`${CABINET_API_URL}/${path}`, {
      method,
      headers: { token },
      data,
      failOnStatusCode: false,
    });

    const buffer = await response.body();
    const text = buffer.toString('utf8');
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    debug(`createCabinetApi: ${method} ${path} -> ${response.status()} ${text.slice(0, 500)}`);

    return { status: response.status(), body, buffer };
  };

  return {
    createTask: (workflowTemplateId: number, taskTemplateId: number) => request('POST', 'tasks', { workflowTemplateId, taskTemplateId }),
    getTask: (taskId: string) => request('GET', `tasks/${taskId}`),
    getDocument: (documentId: string) => request('GET', `documents/${documentId}`),
    updateDocument: (documentId: string, properties: unknown, triggerPath?: unknown) => request(
      'PUT',
      `documents/${documentId}`,
      typeof triggerPath === 'undefined' ? { properties } : { properties, triggerPath },
    ),
    validateDocument: (documentId: string, { commit = false }: { commit?: boolean } = {}) => request('POST', `documents/${documentId}/validate?commit=${commit}`, {}),
    createPdf: (documentId: string) => request('POST', `documents/${documentId}/pdf`, {}),
    commitTask: (taskId: string) => request('POST', `tasks/${taskId}/commit`, {}),
  };
}

export type CabinetApi = Awaited<ReturnType<typeof createCabinetApi>>;

export {
  createCabinetApi,
};
