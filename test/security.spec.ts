import { test, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

/**
 * Security E2E Tests - Exploitation Attempts
 *
 * These tests verify that OWASP A01 vulnerabilities have been properly fixed:
 * - A01: Broken Access Control (CORS, Host Header)
 * - Defense in Depth: Security Headers (CSP, X-Frame-Options, etc.)
 */

import { ensureAtLoginPage, loginWithPersonalKey, importWorkflow, setupLogging, log } from './helpers';

// Test configuration
const ID_API_URL = 'http://localhost:8100';
const ADMIN_FRONT = 'http://localhost:8082';

test.describe('Security - CORS Misconfiguration (Should Reject)', () => {
  test('CORS: Reject cross-origin requests from unauthorized origins', async ({ page }) => {
    // Attempt to make a CORS request from unauthorized origin
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch(`${ID_API_URL}/api/health`, {
          method: 'GET',
          headers: {
            Origin: 'https://attacker.com',
          },
          credentials: 'include',
        });
        return {
          status: res.status,
          corsHeader: res.headers.get('access-control-allow-origin'),
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Should reject or not include attacker origin in CORS header
    if (response.corsHeader) {
      expect(response.corsHeader).not.toContain('attacker.com');
      expect(response.corsHeader).not.toBe('*');
    }
  });

  test('CORS: Preflight request with malicious origin should be rejected or blocked', async ({ context }) => {
    // Use fetch API for OPTIONS since context.request.options doesn't exist
    const response = await context.request.fetch(`${ID_API_URL}/api/auth/status`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const headers = response.headers();
    const corsHeader = headers['access-control-allow-origin'];

    // The behavior depends on CORS_ALLOWED_ORIGINS env var
    // If the origin is in allowlist, it will be echoed back (expected for CORS)
    // If not, it should be omitted or request denied
    if (corsHeader && corsHeader !== '*') {
      // CORS header is restrictive (good) - verify it's allowlisted
      log('CORS uses allowlist: ' + corsHeader);
    } else if (!corsHeader) {
      // No CORS header - correctly rejecting cross-origin (good)
      log('No CORS header - correctly restrictive');
    }

    // Main requirement: must not be wildcard
    if (corsHeader) {
      expect(corsHeader).not.toBe('*');
    }
  });

  test('CORS: Credentials should not be exposed to unauthorized origins', async ({ context }) => {
    const response = await context.request.get(`${ID_API_URL}/api/auth/status`, {
      headers: {
        Origin: 'https://unauthorized-domain.com',
      },
    });

    const allowCredentials = response.headers()['access-control-allow-credentials'];
    const corsOrigin = response.headers()['access-control-allow-origin'];

    // Key requirement: CORS must use allowlist, not wildcard
    if (corsOrigin) {
      expect(corsOrigin).not.toBe('*');
      // If credentials are true, origin must be explicitly whitelisted
      if (allowCredentials === 'true') {
        // Check that it's a specific origin, not wildcard
        expect(corsOrigin).toBeTruthy();
        expect(corsOrigin).not.toBe('*');
      }
    }
  });
});

test.describe('Security - Host Header Injection (Should Reject)', () => {
  test('Host Header: Reject requests with malicious Host header', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/`, {
      headers: {
        Host: 'attacker.com',
      },
    });

    const html = await response.text();

    // Should still route to correct backend or reject the malicious host
    // Check that no attacker.com content or redirect occurs
    expect(html).not.toContain('attacker.com');
  });

  test('Host Header: Nginx should use hardcoded backend hostname', async ({ context }) => {
    // Make request and check for cache poisoning prevention
    const response = await context.request.get(`${ADMIN_FRONT}/api/health`, {
      headers: {
        Host: 'malicious-cache-domain.com:8080',
      },
    });

    // Backend should be id-api:8100 (internal), not the malicious host
    // Response should still be from legitimate backend
    expect(response.status()).toBeLessThan(400);

    // Verify no location header redirecting to malicious host
    const location = response.headers()['location'];
    if (location) {
      expect(location).not.toContain('malicious-cache-domain.com');
    }
  });

  test('Host Header: Cache poisoning via Host header should fail', async ({ context }) => {
    // Request 1: Normal request
    const resp1 = await context.request.get(`${ADMIN_FRONT}/`, {
      headers: { Host: 'localhost:8082' },
    });

    // Request 2: Same path, malicious Host header
    const resp2 = await context.request.get(`${ADMIN_FRONT}/`, {
      headers: { Host: 'attacker-cache.com' },
    });

    const content1 = await resp1.text();
    const content2 = await resp2.text();

    // Both should return legitimate content or error consistently
    // Shouldn't have attacker domain injected in response
    expect(content2).not.toContain('attacker-cache.com');

    // Responses should be identical (from same backend)
    expect(content1 === content2 || (resp1.status() !== 200 && resp2.status() !== 200)).toBeTruthy();
  });
});

test.describe('Security - H2C Smuggling (Should Reject)', () => {
  test('H2C Smuggling: Upgrade header should not allow arbitrary protocol switching', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/api/health`, {
      headers: {
        Connection: 'upgrade',
        Upgrade: 'h2c',
      },
    });

    const upgrade = response.headers()['upgrade'];
    const connection = response.headers()['connection'];

    // Should not upgrade to h2c
    if (upgrade) {
      expect(upgrade.toLowerCase()).not.toBe('h2c');
    }

    // Should either close or keep-alive, not upgrade
    if (connection) {
      expect(connection.toLowerCase()).not.toContain('upgrade');
    }
  });

  test('H2C Smuggling: WebSocket upgrade should be controlled', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/api/health`, {
      headers: {
        Connection: 'upgrade',
        Upgrade: 'websocket',
      },
    });

    // Should either:
    // 1. Allow WebSocket only to specific endpoints (not /api/health)
    // 2. Reject WebSocket entirely
    const upgrade = response.headers()['upgrade'];

    // /api/health should not upgrade to websocket
    expect(upgrade === undefined || upgrade.toLowerCase() !== 'websocket' || response.status() === 400 || response.status() === 426).toBeTruthy();
  });
});

test.describe('Security - Defense in Depth', () => {
  test('Security Headers: CSP should be present', async ({ page }) => {
    const response = await page.goto(`${ADMIN_FRONT}/`);
    const headers = response.headers();

    // CSP should be present
    const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'];

    // CSP should be configured to restrict script execution
    expect(csp).toBeTruthy();
    expect(csp.includes('script-src') || csp.includes('default-src')).toBeTruthy();
  });

  test('Security Headers: X-Frame-Options should prevent clickjacking', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/`);
    const xFrameOptions = response.headers()['x-frame-options'];

    // Should restrict framing
    expect(xFrameOptions).toBeTruthy();
    expect(xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN' || xFrameOptions.includes('ALLOW-FROM')).toBeTruthy();
  });

  test('Security Headers: X-Content-Type-Options should prevent MIME sniffing', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/`);
    const xContentType = response.headers()['x-content-type-options'];

    // Must be set to nosniff to prevent MIME type sniffing
    expect(xContentType).toBe('nosniff');
  });

  test('Security Headers: Strict-Transport-Security should enforce HTTPS', async ({ context }) => {
    const response = await context.request.get(`${ADMIN_FRONT}/`);
    const hsts = response.headers()['strict-transport-security'];

    // In production, should enforce HTTPS with max-age
    // May not be present in localhost development
    if (hsts) {
      expect(hsts).toContain('max-age');
    }
  });
});

test.describe('Security - File download token (Should Reject Other Users)', () => {
  const CABINET_URL = 'http://localhost:8081';
  const CABINET_API_URL = 'http://localhost:8101';

  const loginToCabinet = async (browser: Browser, p12: string, password: string): Promise<{ page: Page; token: string }> => {
    const page = await (await browser.newContext()).newPage();
    await setupLogging(page);
    page.setDefaultTimeout(15000);
    await page.goto(`${CABINET_URL}/`);
    await page.waitForLoadState('networkidle');
    // The redirect to the login page can come after the network is idle, so wait for either outcome.
    await page.waitForFunction(() => globalThis.location.port === '8080' || !!localStorage.getItem('token'), null, { timeout: 30000 });
    if (page.url().includes('localhost:8080')) {
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, p12, password);
    }
    await expect(page).toHaveURL(/^http:\/\/localhost:8081/);
    await page.waitForFunction(() => !!localStorage.getItem('token'));
    const token = await page.evaluate(() => localStorage.getItem('token'));
    return { page, token };
  };

  test('File download token: another user must not read the file', async ({ browser }) => {
    test.setTimeout(240000);

    log('Importing workflow 940081 as an admin');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await importWorkflow(adminPage, './fixtures/workflow-940081.bpmn', false, true);
    // The server accepts an import before it has saved it, so reload until the workflow is there.
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/940081');
      await expect(adminPage).toHaveTitle(/file preview access/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();

    const victim = await loginToCabinet(browser, '../config/admin.p12', 'admin');
    const attacker = await loginToCabinet(browser, '../config/demo.p12', 'demo');

    try {
      const call = (who: { page: Page; token: string }, method: string, path: string, options: object = {}) =>
        who.page.request.fetch(`${CABINET_API_URL}/${path}`, { method, headers: { token: who.token }, failOnStatusCode: false, ...options });

      const secret = Buffer.from(`victim file ${Date.now()} ${Math.random()}\n`);

      const created = await call(victim, 'POST', 'tasks', { data: { workflowTemplateId: 940081, taskTemplateId: 940081001 } });
      expect(created.status(), 'create task').toBe(200);
      const { id: taskId, documentId } = (await created.json()).data;

      const upload = await call(victim, 'POST', `documents/${documentId}/attachments?file_name=victim.pdf`, {
        headers: { token: victim.token, 'content-type': 'application/pdf' },
        data: secret,
      });
      expect(upload.status(), 'upload attachment').toBe(200);

      const commit = await call(victim, 'POST', `tasks/${taskId}/commit`, { data: {} });
      expect(commit.status(), 'commit task').toBe(200);

      let downloadToken: string;
      // The file is listed once the committed document is final, which is not immediate.
      await expect(async () => {
        const files = await call(victim, 'GET', `documents/${documentId}/workflow_files?step=filesPreview`);
        expect(files.status(), 'list workflow files').toBe(200);
        const { data } = await files.json();
        expect(data).toHaveLength(1);
        downloadToken = data[0].downloadToken;
      }).toPass({ timeout: 30000 });
      expect(downloadToken).toBeTruthy();

      // Sanity: the owner can download the file with the token
      const own = await call(victim, 'GET', `files/${downloadToken}`);
      expect(own.status()).toBe(200);
      expect((await own.body()).equals(secret)).toBeTruthy();

      // Another authenticated user holding the token must be denied and must not receive the bytes
      const foreign = await call(attacker, 'GET', `files/${downloadToken}`);
      const foreignBody = await foreign.body();
      expect(foreign.status()).toBe(403);
      expect(foreignBody.equals(secret)).toBeFalsy();
    } finally {
      await victim.page.context().close();
      await attacker.page.context().close();
    }
  });
});
