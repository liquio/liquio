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

  const send = async (method: string, path: string, data: unknown, contentType?: string): Promise<CabinetApiResponse> => {
    debug(`createCabinetApi: ${method} ${path} ${data && !Buffer.isBuffer(data) ? JSON.stringify(data) : ''}`);
    const response = await page.request.fetch(`${CABINET_API_URL}/${path}`, {
      method,
      headers: contentType ? { token, 'content-type': contentType } : { token },
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

  const request = (method: string, path: string, data?: unknown) => send(method, path, data);
  const requestRaw = (method: string, path: string, data: Buffer, contentType = 'application/pdf') => send(method, path, data, contentType);

  return {
    createTask: (workflowTemplateId: number, taskTemplateId: number) => request('POST', 'tasks', { workflowTemplateId, taskTemplateId }),
    getTask: (taskId: string) => request('GET', `tasks/${taskId}`),
    getDocument: (documentId: string) => request('GET', `documents/${documentId}`),
    updateDocument: (documentId: string, properties: unknown, triggerPath?: unknown) =>
      request('PUT', `documents/${documentId}`, typeof triggerPath === 'undefined' ? { properties } : { properties, triggerPath }),
    validateDocument: (documentId: string, { commit = false }: { commit?: boolean } = {}) =>
      request('POST', `documents/${documentId}/validate?commit=${commit}`, {}),
    createPdf: (documentId: string) => request('POST', `documents/${documentId}/pdf`, {}),
    uploadAttachment: (documentId: string, rawQuery: string, body: Buffer, contentType = 'application/pdf') =>
      requestRaw('POST', `documents/${documentId}/attachments?${rawQuery}`, body, contentType),
    commitTask: (taskId: string) => request('POST', `tasks/${taskId}/commit`, {}),
  };
}

export type CabinetApi = Awaited<ReturnType<typeof createCabinetApi>>;

export { createCabinetApi };
