import createDebug from 'debug';
import type { Page } from '@playwright/test';

const debugPackage = createDebug('test');

const log = debugPackage.extend('log');
const debug = debugPackage.extend('debug');

// Global map to store trace IDs by request key (method + URL)
const requestTraceIds = new Map<string, string[]>();

async function setupLogging(page: Page): Promise<void> {
  debug('setupLogging: Setting up request and response logging');
  page.on('request', (request) => {
    debug(`REQUEST: ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    debug(`RESPONSE: ${response.status()} ${response.url()}`);
    const traceId = response.headers()['x-trace-id'];
    if (traceId) {
      debug(`RESPONSE TRACE ID: ${traceId}`);
      // Store trace ID by request key
      const requestKey = `${response.request().method()} ${response.request().url()}`;
      if (!requestTraceIds.has(requestKey)) {
        requestTraceIds.set(requestKey, []);
      }
      requestTraceIds.get(requestKey).push(traceId);
    }
  });
}

function getTraceIdsForRequest(method: string, url: string): string[] {
  const requestKey = `${method} ${url}`;
  return requestTraceIds.get(requestKey) || [];
}

export {
  setupLogging,
  getTraceIdsForRequest,
  requestTraceIds,
  log,
  debug,
};
