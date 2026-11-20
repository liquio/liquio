import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { ensureAtLoginPage, loginWithPersonalKey, importWorkflow, setupLogging, log } from './helpers';

const ADMIN_URL = 'http://localhost:8082';
const CABINET_URL = 'http://localhost:8081';
const ADMIN_API_URL = 'http://localhost:8102';

const NOISE = /fonts\.googleapis|Failed to load resource|\[fetch-error\] \S+\/tasks\/\d+ 404/;
// The editor sends DELETE /tasks/<bpmn element id> for elements that were never saved (non-numeric id) and admin-api answers 422; harmless
const UNSAVED_ELEMENT_DELETE = /\[fetch-error\] http:\/\/localhost:8102\/tasks\/(?!\d+(?:\D|$))[^\s/?]+ 422/;
const SPINNER = '.MuiCircularProgress-root,.MuiLinearProgress-root,[role=progressbar]';

// Collects console and page errors (and non-GET admin-api calls) of a step
function watch(page: Page) {
  const errors: string[] = [];
  const writes: string[] = [];
  const onConsole = (m: any) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  };
  const onPageError = (e: Error) => errors.push('pageerror: ' + e.message);
  const onResponse = (r: any) => {
    if (r.request().method() !== 'GET' && r.url().startsWith(ADMIN_API_URL + '/')) {
      writes.push(`${r.request().method()} ${r.status()} ${r.url().slice(ADMIN_API_URL.length)}`);
    }
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  return {
    writes,
    relevant: () => errors.filter((e) => !NOISE.test(e) && !UNSAVED_ELEMENT_DELETE.test(e)),
    stop: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
    },
  };
}

async function step(page: Page, name: string, fn: (w: ReturnType<typeof watch>) => Promise<void>): Promise<void> {
  await test.step(name, async () => {
    const w = watch(page);
    try {
      await fn(w);
      // The import helper triggers an expected 400 (overwrite confirmation) in the seeding step
      if (!name.startsWith('Log into admin')) expect(w.relevant(), 'No console or page errors').toEqual([]);
    } finally {
      w.stop();
    }
  });
}

test.describe.serial('Admin and cabinet smoke after the queue library upgrade', () => {
  test.setTimeout(10 * 60 * 1000);

  test('admin editor, lists, units, registry, cabinet task and workflow versions', async ({ page }) => {
    await setupLogging(page);

    await step(page, 'Log into admin and seed workflow 910001', async () => {
      await page.goto(ADMIN_URL + '/');
      await ensureAtLoginPage(page);
      await loginWithPersonalKey(page, '../config/admin.p12', 'admin');
      await expect(page).toHaveURL(/^http:\/\/localhost:8082\//);

      // Overwriting restores the original 4 elements and drops the versions of earlier runs
      await importWorkflow(page, './fixtures/workflow-910001.bpmn', false, true);
    });

    await step(page, 'Workflow editor: add, delete, save, double save', async (w) => {
      await page.goto(`${ADMIN_URL}/workflow/910001`, { waitUntil: 'networkidle' });
      const shapes = page.locator('.djs-element.djs-shape');
      await shapes.first().waitFor();
      await page.waitForTimeout(1000);
      const box = await page.locator('.djs-container svg').first().boundingBox();
      const save = page.getByRole('button', { name: 'Save' });
      const spinner = page.locator(SPINNER);

      const addTask = async (x: number, y: number) => {
        await page.locator('.djs-palette .entry[data-action="create.task"]').click();
        await page.mouse.click(box.x + x, box.y + y);
      };
      const isExtra = (id: string) => /^(Activity_|task-)/.test(id) && id !== 'task-910001001';
      const waitSaved = async () => {
        await page.waitForTimeout(1000);
        await expect(save).toBeDisabled({ timeout: 20000 });
        await expect(spinner).toHaveCount(0, { timeout: 20000 });
      };

      const before = await shapes.count();
      expect(before, 'Workflow 910001 starts with its 4 original elements').toBe(4);

      await addTask(400, 300);
      await addTask(600, 300);
      await expect(shapes).toHaveCount(before + 2);
      const ids = await shapes.evaluateAll((a) => a.map((x) => x.getAttribute('data-element-id')));
      const victim = ids.filter(isExtra).pop();
      const hit = page.locator(`.djs-element.djs-shape[data-element-id="${victim}"] .djs-hit`).first();
      await hit.scrollIntoViewIfNeeded();
      const b = await hit.boundingBox();
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      // The app bar can overlap the context pad, so click the entry through the DOM
      await page.locator('.djs-context-pad .entry[data-action="delete"]').evaluate((e: HTMLElement) => e.click());
      await expect(shapes).toHaveCount(before + 1);
      await save.click();
      await waitSaved();
      expect(
        w.writes.some((x) => /^PUT 200 \/workflows\/910001/.test(x)),
        `PUT /workflows/910001 succeeded: ${w.writes}`,
      ).toBe(true);

      // Edit and save twice in a row
      await addTask(700, 450);
      await save.click();
      await addTask(850, 450);
      await save.click({ timeout: 2000 }).catch(() => log('Second Save click skipped: button disabled while the first save is in flight'));
      await waitSaved();
      await page.waitForTimeout(3000);
      if (await save.isEnabled()) {
        await save.click();
        await waitSaved();
      }
      const puts = w.writes.filter((x) => x.startsWith('PUT '));
      expect(puts.length).toBeGreaterThanOrEqual(2);
      expect(
        puts.every((x) => x.startsWith('PUT 200')),
        `All workflow PUTs returned 200: ${puts}`,
      ).toBe(true);
    });

    await step(page, 'Workflow list, journal and processes load', async () => {
      for (const p of ['workflow', 'workflow/journal', 'workflow/processes']) {
        await page.goto(`${ADMIN_URL}/${p}`, { waitUntil: 'networkidle' });
        const pager = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ').match(/\d+ - \d+ from \d+/)?.[0] ?? null;
        await expect.poll(pager, { timeout: 20000, message: `${p}: pager shown` }).not.toBeNull();
        await expect(page.locator(SPINNER)).toHaveCount(0, { timeout: 15000 });
      }
    });

    await step(page, 'Unit 1000013: add and remove a member', async (w) => {
      await page.goto(`${ADMIN_URL}/users/units/1000013`, { waitUntil: 'networkidle' });
      const rows = page.locator('tbody tr');
      const member = rows.filter({ hasText: 'Liquio Admin' });
      const remove = async () => {
        await member.first().getByRole('button', { name: 'Delete' }).click();
        await expect(member).toHaveCount(0, { timeout: 15000 });
      };
      await expect(rows.first()).toContainText(/No users found|Liquio Admin/, { timeout: 15000 });
      if (await member.count()) {
        log('Member left over from a previous run, removing first');
        await remove();
      }
      await expect(rows.first()).toContainText('No users found');

      await page.getByRole('button', { name: /add users/i }).click();
      const dlg = page.getByRole('dialog');
      const input = dlg.locator('input').first();
      await input.click();
      await input.pressSequentially('Liquio', { delay: 50 });
      await dlg.getByText('Liquio Admin (').click();
      await dlg
        .getByRole('row', { name: /Liquio Admin \(/ })
        .getByRole('button', { name: /^add$/i })
        .click();
      await expect.poll(() => w.writes.filter((x) => /^(POST|PUT) 2\d\d /.test(x)).length, { timeout: 15000 }).toBeGreaterThan(0);
      await dlg.getByRole('button', { name: /^close$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10000 });
      await expect(member).toHaveCount(1, { timeout: 15000 });
      await remove();
      await expect(rows.first()).toContainText('No users found');
    });

    await step(page, 'Registry: create register and key, export key', async () => {
      const stamp = Date.now();
      await page.goto(`${ADMIN_URL}/registry`, { waitUntil: 'networkidle' });
      await page.locator('button', { hasText: /^create$/i }).click();
      await page.locator('input[name="name"]').fill(`Queue smoke register ${stamp}`);
      await page.locator('[role=dialog] [name="description"]').fill('Queue smoke');
      const created = page.waitForResponse((r) => r.request().method() === 'POST' && /\/registers$/.test(r.url()), { timeout: 20000 });
      await page.locator('[role=dialog] button', { hasText: /^save$/i }).click();
      const reg = await (await created).json();
      const registerId = reg.data?.id ?? reg.id;
      expect(registerId, 'Register created').toBeTruthy();

      await page.goto(`${ADMIN_URL}/registry/${registerId}`, { waitUntil: 'networkidle' });
      await page.locator('button', { hasText: /^create$/i }).click();
      await page.locator('[role=dialog] input[name="name"]').fill(`queue_smoke_key_${stamp}`);
      await page.locator('[role=dialog] button', { hasText: /^save$/i }).click();
      await expect(page.locator('tbody tr').first()).toContainText(`queue_smoke_key_${stamp}`, { timeout: 15000 });

      // The UI polls the export status every 10 s
      await page.locator('button', { hasText: /^export$/i }).click();
      await page.locator('[role=dialog] input[type=checkbox]').first().check();
      const download = page.waitForEvent('download', { timeout: 60000 });
      await page.locator('[role=dialog] button', { hasText: /^export$/i }).click();
      const d = await download;
      expect(d.suggestedFilename()).toMatch(/^register-\d+-\d+\.dat$/);
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15000 });
      await expect(page.locator(SPINNER)).toHaveCount(0, { timeout: 15000 });
    });

    await step(page, 'Cabinet: start task, edit fields, autosave', async () => {
      const saves: number[] = [];
      const onResp = (r: any) => {
        if (r.request().method() === 'PUT' && /\/documents\/[0-9a-f-]{36}/.test(r.url())) saves.push(r.status());
      };
      page.on('response', onResp);
      try {
        await page.goto(`${CABINET_URL}/`);
        await page.waitForLoadState('networkidle');
        if (page.url() === 'http://localhost:8080/') {
          await ensureAtLoginPage(page);
          await loginWithPersonalKey(page, '../config/admin.p12', 'admin');
        }
        await page.goto(`${CABINET_URL}/tasks/create/910001/910001001`);
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}\/textNumbers/, { timeout: 30000 });
        const text = page.getByLabel('Text value');
        await expect(text).toBeVisible({ timeout: 15000 });

        await text.fill('Queue smoke ' + Date.now());
        await page.locator('#numberValue').fill('12.5');
        await page.getByLabel('Integer value').fill('7');
        await text.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);
        expect(saves.length, 'Autosave happened').toBeGreaterThan(0);
        expect(
          saves.every((s) => s === 200),
          `Autosave PUT /documents returned 200: ${saves}`,
        ).toBe(true);
        await expect(page.locator(SPINNER)).toHaveCount(0, { timeout: 15000 });

        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.getByLabel('Integer value')).toHaveValue('7', { timeout: 15000 });
        await expect(page.locator('#numberValue')).toHaveValue(/12\.5/);
      } finally {
        page.off('response', onResp);
      }
    });

    await step(page, 'Workflow versions: create version, restore oldest', async (w) => {
      await page.goto(`${ADMIN_URL}/workflow/910001`, { waitUntil: 'networkidle' });
      const shapes = page.locator('.djs-element.djs-shape');
      await shapes.first().waitFor();
      await page.waitForTimeout(1500);
      const before = await shapes.count();
      expect(before, 'The editor step left extra elements').toBeGreaterThan(4);

      await page.getByRole('button', { name: 'Process Versions' }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button', { name: /^create version$/i }).click();
      await page.locator('input[name="name"]').fill('queue-smoke-' + Date.now());
      await page.getByRole('button', { name: /^create$/i }).click();
      await expect(page.locator('input[name="name"]')).toHaveCount(0, { timeout: 15000 });
      expect(
        w.writes.some((x) => /^POST 202 \/bpmn-workflows\/910001\/versions/.test(x)),
        `Version created: ${w.writes}`,
      ).toBe(true);

      const cards = page.getByRole('dialog').locator('.MuiCard-root');
      await expect(cards.first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(500);
      expect(await cards.count(), 'At least two versions listed').toBeGreaterThanOrEqual(2);
      await cards.last().locator('.MuiCardHeader-content').click();
      await page.getByRole('button', { name: /^restore$/i }).click();
      await page
        .locator('[role=dialog]')
        .last()
        .getByRole('button', { name: /^restore$/i })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30000 });
      await expect(page.locator(SPINNER)).toHaveCount(0, { timeout: 15000 });
      await page.waitForTimeout(1500);
      expect(await shapes.count(), 'Diagram reverted to an older version').toBeLessThan(before);
    });
  });
});
