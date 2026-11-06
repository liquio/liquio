import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';

import {
  ensureAtLoginPage,
  loginWithPersonalKey,
  importWorkflow,
  createCabinetApi,
  getDockerComposeLogs,
  setupLogging,
  log,
} from './helpers';

/*
 * Service logs contain no configuration secrets.
 * Secret values are collected from the generated local config at runtime, some typical traffic
 * is sent through the services, and the logs since container start must not contain any of the
 * values or a Basic credential. Only the location of a value (service/file:key path) is ever printed.
 */

const CONFIG_DIR = path.resolve(__dirname, '../config');
const CABINET_URL = 'http://localhost:8081';
const SERVICES = ['task', 'admin-api', 'event', 'notification', 'persist-link', 'filestorage', 'register'];
const SECRET_KEY = /token|password|passwd|secret|apikey|api_key|accesskey|secretkey|privatekey|authorization|credential/i;
const MIN_LENGTH = 12;
const MIN_PASSWORD_LENGTH = 8;
// A user name, not a secret: it sits next to the password under an authorization key and is a normal part of request logs.
const NOT_SECRET = new Set(['notification/config.json:production.authorization.list.0.user']);

const walkJsonFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walkJsonFiles(full);
  return entry.isFile() && entry.name.endsWith('.json') ? [full] : [];
});

const collectSecrets = () => {
  const found = new Map<string, { value: string; where: string }>();
  const add = (value: string, where: string) => {
    if (!found.has(value)) found.set(value, { value, where });
  };

  const checkString = (value: string, keyPath: string[], secretKey: boolean, where: string) => {
    if (secretKey && value.length >= MIN_LENGTH) add(value, where);
    if (value.startsWith('Basic ')) {
      const encoded = value.slice('Basic '.length).trim();
      if (encoded.length >= MIN_LENGTH) add(encoded, where);
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (decoded.includes(':') && password.length >= MIN_PASSWORD_LENGTH) add(password, where);
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      try {
        const { password } = new URL(value);
        if (password.length >= MIN_PASSWORD_LENGTH) add(decodeURIComponent(password), where);
      } catch {
        // not a URL
      }
    }
  };

  const walk = (node: any, keyPath: string[], secretKey: boolean, base: string) => {
    if (typeof node === 'string') {
      checkString(node, keyPath, secretKey, `${base}:${keyPath.join('.')}`);
    } else if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...keyPath, String(index)], secretKey, base));
    } else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([key, value]) => walk(value, [...keyPath, key], secretKey || SECRET_KEY.test(key), base));
    }
  };

  fs.readdirSync(CONFIG_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((service) => {
      walkJsonFiles(path.join(CONFIG_DIR, service.name)).forEach((file) => {
        let content: any;
        try {
          content = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
          return;
        }
        walk(content, [], false, `${service.name}/${path.relative(path.join(CONFIG_DIR, service.name), file)}`);
      });
    });

  return [...found.values()].filter((candidate) => !NOT_SECRET.has(candidate.where));
};

test.describe('Service logs contain no configuration secrets', () => {
  let candidates: { value: string; where: string }[];
  const logs: Record<string, string> = {};

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(300000);

    candidates = collectSecrets();
    expect(candidates.length, 'config layout changed').toBeGreaterThan(3);

    log('Logging in to admin and importing workflow 900005');
    const adminPage = await (await browser.newContext()).newPage();
    await setupLogging(adminPage);
    adminPage.setDefaultTimeout(15000);
    await adminPage.goto('http://localhost:8082/');
    await ensureAtLoginPage(adminPage);
    await loginWithPersonalKey(adminPage, '../config/admin.p12', 'admin');
    await expect(adminPage).toHaveURL(/^http:\/\/localhost:8082\//);
    await adminPage.goto('http://localhost:8082/workflow');
    await adminPage.waitForLoadState('networkidle');
    await importWorkflow(adminPage, './fixtures/workflow-900005.bpmn', false, true);
    await expect(async () => {
      await adminPage.goto('http://localhost:8082/workflow/900005');
      await expect(adminPage).toHaveTitle(/^Text and numbers controls/, { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await adminPage.context().close();

    log('Creating a task and a PDF as demo user');
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupLogging(page);
    page.setDefaultTimeout(15000);
    await page.goto(`${CABINET_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => globalThis.location.port === '8080' || !!localStorage.getItem('token'), null, { timeout: 30000 });
    if (page.url().includes('localhost:8080')) {
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/demo.p12', 'demo');
    }
    await expect(page).toHaveURL(/^http:\/\/localhost:8081/);
    const api = await createCabinetApi(page);
    const task = await api.createTask(900005, 900005001);
    expect(task.status, 'create task').toBe(200);
    await api.createPdf(task.body.data.documentId);
    await context.close();

    await request.get('http://localhost:3346/test/ping');

    SERVICES.forEach((service) => {
      logs[service] = getDockerComposeLogs(service);
    });
  });

  for (const service of SERVICES) {
    test(`${service} logs contain no configuration secrets`, () => {
      const serviceLogs = logs[service];
      const hits = candidates.filter((candidate) => serviceLogs.includes(candidate.value)).map((candidate) => candidate.where);
      expect(hits, `${service}: config secrets found in logs`).toEqual([]);

      const basic = /Basic [A-Za-z0-9+/]{16,}={0,2}/;
      expect(basic.test(serviceLogs), `${service}: Basic credential in logs`).toBe(false);
    });
  }
});
