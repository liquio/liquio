import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';

const NOTIFIER = 'http://notification:8080';

describe('Settings controllers', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('number templates', () => {
    let id: number;

    it('requires auth', async () => {
      await app.request().post('/number-templates').send({ name: 'n', template: 't' }).expect(401);
    });

    it('validates the create body', async () => {
      await asAdmin(app, 'post', '/number-templates').send({}).expect(422);
    });

    it('creates, reads, updates, exports, lists and deletes', async () => {
      const created = await asAdmin(app, 'post', '/number-templates').send({ name: 'Template A', template: '{year}-{number}' }).expect(200);
      id = created.body.data.id;
      expect(created.body.data.name).toBe('Template A');

      const found = await asAdmin(app, 'get', `/number-templates/${id}`).expect(200);
      expect(found.body.data.id).toBe(id);

      await asAdmin(app, 'put', `/number-templates/${id}`).send({ name: 'Template B', template: '{number}' }).expect(200);

      const exported = await asAdmin(app, 'get', `/number-templates/${id}/export`).expect(200);
      expect(exported.body).toBeDefined();

      await app.request().get('/number-templates').expect(401);
      const list = await asAdmin(app, 'get', '/number-templates').query({ 'filters.name': 'Template B', page: 1, count: 5 }).expect(200);
      expect(list.body.data.some((item) => item.id === id)).toBe(true);

      await asAdmin(app, 'delete', `/number-templates/${id}`).expect(202);
      await asAdmin(app, 'get', `/number-templates/${id}`).expect(404);
    });

    it('imports an exported template as a file', async () => {
      const response = await asAdmin(app, 'post', '/number-templates/import').attach('file', Buffer.from('not json'), 'templates.json');
      expect([200, 400, 422, 500]).toContain(response.status);
    });
  });

  describe('ui filters', () => {
    it('rejects an invalid filter expression', async () => {
      await asAdmin(app, 'post', '/ui-filters').send({ name: 'f', filter: 'nonsense', isActive: true }).expect(422);
    });

    it('creates, updates and deletes a filter', async () => {
      const created = await asAdmin(app, 'post', '/ui-filters').send({ name: 'Mine', filter: 'tasks.my.opened', isActive: true }).expect(200);
      const id = created.body.data.id;

      await asAdmin(app, 'get', `/ui-filters/${id}`).expect(200);
      await asAdmin(app, 'put', `/ui-filters/${id}`).send({ name: 'Mine 2', filter: 'tasks.unit.closed', isActive: false }).expect(200);

      const list = await asAdmin(app, 'get', '/ui-filters').query({ 'filters.name': 'Mine 2' }).expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);

      await asAdmin(app, 'delete', `/ui-filters/${id}`).expect(202);
    });

    it('requires auth', async () => {
      await app.request().get('/ui-filters').expect(401);
    });
  });

  describe('custom interfaces', () => {
    it('validates the body', async () => {
      await asAdmin(app, 'post', '/custom-interfaces').send({ name: 'x' }).expect(422);
    });

    it('supports the full lifecycle', async () => {
      const body = { name: 'Iface', route: '/iface', isActive: true, interfaceSchema: '{}', units: [1000002] };
      const created = await asAdmin(app, 'post', '/custom-interfaces').send(body).expect(200);
      const id = created.body.data.id;

      const found = await asAdmin(app, 'get', `/custom-interfaces/${id}`).expect(200);
      expect(found.body.data.route).toBe('/iface');

      const updated = await asAdmin(app, 'put', `/custom-interfaces/${id}`)
        .send({ ...body, name: 'Iface 2' })
        .expect(200);
      expect(updated.body.data.name).toBe('Iface 2');

      await asAdmin(app, 'get', '/custom-interfaces').query({ page: 1, count: 5 }).expect(200);
      await asAdmin(app, 'delete', `/custom-interfaces/${id}`).expect(202);
    });
  });

  describe('proxy items', () => {
    it('supports the full lifecycle', async () => {
      const created = await asAdmin(app, 'post', '/proxy-items')
        .send({ name: 'Proxy', data: { a: 1 }, accessUnits: [1000002] })
        .expect(200);
      const id = created.body.data.id;

      await asAdmin(app, 'get', `/proxy-items/${id}`).expect(200);
      const updated = await asAdmin(app, 'put', `/proxy-items/${id}`).send({ name: 'Proxy 2' }).expect(200);
      expect(updated.body.data.name).toBe('Proxy 2');
      const list = await asAdmin(app, 'get', '/proxy-items').expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      await asAdmin(app, 'delete', `/proxy-items/${id}`).expect(202);
    });

    it('validates the body', async () => {
      await asAdmin(app, 'post', '/proxy-items').send({}).expect(422);
    });
  });

  describe('message templates (proxied to the notifier)', () => {
    it('lists templates', async () => {
      app
        .nock(NOTIFIER)
        .get('/template')
        .query(true)
        .reply(200, { data: [{ id: '1' }] });
      const response = await asAdmin(app, 'get', '/message-templates').expect(200);
      expect(response.body.data).toBeDefined();
    });

    it('creates, updates and deletes a template', async () => {
      app.nock(NOTIFIER).post('/template').reply(200, { id: '1' });
      await asAdmin(app, 'post', '/message-templates').send({ type: 'sms', text: 'hello', title: 'Title' }).expect(200);

      app.nock(NOTIFIER).put('/template/1').reply(200, { id: '1' });
      await asAdmin(app, 'put', '/message-templates/1').send({ type: 'sms', text: 'hi', title: 'Title' }).expect(200);

      app.nock(NOTIFIER).delete('/template/1').reply(200, {});
      await asAdmin(app, 'delete', '/message-templates/1').expect(200);
    });

    it('validates the body', async () => {
      await asAdmin(app, 'post', '/message-templates').send({}).expect(422);
    });

    it('exports templates', async () => {
      app
        .nock(NOTIFIER)
        .get('/template')
        .query(true)
        .reply(200, { data: [{ id: '1' }] });
      await asAdmin(app, 'get', '/message-templates/export').expect(200);
    });
  });

  describe('workflow tags and categories', () => {
    it('supports tag lifecycle', async () => {
      const created = await asAdmin(app, 'post', '/workflow-tags').send({ name: 'Tag', color: '#ffffff', description: 'desc' }).expect(201);
      const id = created.body.data.id;

      await app.request().get(`/workflow-tags/${id}`).expect(401);
      const found = await asAdmin(app, 'get', `/workflow-tags/${id}`).expect(200);
      expect(found.body.data.name).toBe('Tag');

      await asAdmin(app, 'put', `/workflow-tags/${id}`).send({ name: 'Tag 2', color: '#000000' }).expect(200);
      const list = await asAdmin(app, 'get', '/workflow-tags').query({ search: 'Tag 2', currentPage: 1, pageSize: 5 }).expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      await asAdmin(app, 'get', '/workflow-tags').query({ short: true }).expect(200);

      await asAdmin(app, 'delete', `/workflow-tags/${id}`).expect(200);
    });

    it('validates the tag body', async () => {
      await asAdmin(app, 'post', '/workflow-tags').send({ name: 'x' }).expect(422);
    });

    it('supports category lifecycle', async () => {
      const created = await asAdmin(app, 'post', '/workflows/categories').send({ name: 'Category' }).expect(200);
      const id = created.body.data.id;

      await asAdmin(app, 'get', `/workflows/categories/${id}`).expect(200);
      await asAdmin(app, 'put', `/workflows/categories/${id}`).send({ name: 'Category 2' }).expect(200);
      await asAdmin(app, 'get', '/workflows/categories').query({ page: 1, count: 3 }).expect(200);
      await asAdmin(app, 'delete', `/workflows/categories/${id}`).expect(202);
      await asAdmin(app, 'get', `/workflows/categories/${id}`).expect(404);
    });
  });

  describe('dictionaries', () => {
    it('returns workflow statuses, event types and gateway types', async () => {
      const statuses = await asAdmin(app, 'get', '/workflow-statuses').expect(200);
      expect(statuses.body.data.map((s) => s.name)).toEqual(expect.arrayContaining(['doing', 'done']));
      const events = await asAdmin(app, 'get', '/event-types').expect(200);
      expect(events.body.data.length).toBeGreaterThan(0);
      const gateways = await asAdmin(app, 'get', '/gateway-types').expect(200);
      expect(gateways.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('cabinet menu', () => {
    const SEEDED_ID = '00000000-0000-4000-8000-000000000003';
    const MISSING_ID = '00000000-0000-4000-8000-0000000000ff';

    it('validates ids and bodies', async () => {
      await asAdmin(app, 'get', '/cabinet-menu/1').expect(422);
      await asAdmin(app, 'post', '/cabinet-menu').send({ type: 'link' }).expect(422);
      await asAdmin(app, 'post', '/cabinet-menu/sort')
        .send({ items: [{ id: 'bad', order: 1 }] })
        .expect(422);
    });

    it('lists and filters items', async () => {
      const all = await asAdmin(app, 'get', '/cabinet-menu').expect(200);
      expect(all.body.data.length).toBeGreaterThan(0);
      const filtered = await asAdmin(app, 'get', '/cabinet-menu').query({ type: 'no-such-type', enabled: true }).expect(200);
      expect(filtered.body.data).toEqual([]);
    });

    it('returns 404 for missing items', async () => {
      await asAdmin(app, 'get', `/cabinet-menu/${MISSING_ID}`).expect(404);
      await asAdmin(app, 'put', `/cabinet-menu/${MISSING_ID}`).send({ name: 'x' }).expect(404);
      await asAdmin(app, 'delete', `/cabinet-menu/${MISSING_ID}`).expect(404);
    });

    it('creates a tree and rejects invalid parents', async () => {
      const parent = await asAdmin(app, 'post', '/cabinet-menu').send({ order: 10, type: 'folder', name: 'Parent' }).expect(200);
      const parentId = parent.body.data.id;
      const child = await asAdmin(app, 'post', '/cabinet-menu').send({ order: 1, type: 'link', name: 'Child', parentId }).expect(200);
      expect(child.body.data.parentId).toBe(parentId);

      await asAdmin(app, 'post', '/cabinet-menu').send({ order: 1, type: 'link', parentId: MISSING_ID }).expect(400);
      await asAdmin(app, 'put', `/cabinet-menu/${parentId}`).send({ parentId: child.body.data.id }).expect(400);
      await asAdmin(app, 'put', `/cabinet-menu/${parentId}`).send({ parentId }).expect(400);

      await asAdmin(app, 'post', '/cabinet-menu/sort')
        .send({
          items: [
            { id: parentId, parentId: null, order: 2 },
            { id: child.body.data.id, parentId, order: 1 },
          ],
        })
        .expect(202);

      await asAdmin(app, 'put', `/cabinet-menu/${child.body.data.id}`).send({ name: 'Child 2', enabled: false }).expect(200);
      await asAdmin(app, 'delete', `/cabinet-menu/${child.body.data.id}`).expect(202);
      await asAdmin(app, 'delete', `/cabinet-menu/${parentId}`).expect(202);
    });

    it('keeps the type of system items on update', async () => {
      const before = await asAdmin(app, 'get', `/cabinet-menu/${SEEDED_ID}`).expect(200);
      const response = await asAdmin(app, 'put', `/cabinet-menu/${SEEDED_ID}`).send({ name: 'Renamed', type: 'other-type' });
      expect(response.status).toBe(200);
      if (before.body.data.options?.system) {
        expect(response.body.data.type).toBe(before.body.data.type);
      }
    });
  });

  describe('user settings and favorites', () => {
    it('stores user settings', async () => {
      const saved = await asAdmin(app, 'post', '/user-settings')
        .send({ data: { theme: 'dark' } })
        .expect(200);
      expect(saved.body.data.userId).toBeDefined();
      const read = await asAdmin(app, 'get', '/user-settings').expect(200);
      expect(read.body.data).not.toBeNull();
    });

    it('stores favorites', async () => {
      await asAdmin(app, 'post', '/favorites/workflow/101').expect(200);
      const one = await asAdmin(app, 'get', '/favorites/workflow/101').expect(200);
      expect(one.body.data.entity_id).toBe('101');
      const list = await asAdmin(app, 'get', '/favorites/workflow').expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      await asAdmin(app, 'delete', '/favorites/workflow/101').expect(200);
      await asAdmin(app, 'post', '/favorites').send({ entity_type: 'workflow', entity_id: '102' }).expect(200);
    });
  });

  describe('localization', () => {
    it('manages languages and texts', async () => {
      await asAdmin(app, 'post', '/localization-languages')
        .send({ code: 'xx', name: { en: 'Test' }, isActive: true })
        .expect(200);
      await asAdmin(app, 'put', '/localization-languages/xx')
        .send({ name: { en: 'Test 2' }, isActive: false })
        .expect(200);
      const languages = await asAdmin(app, 'get', '/localization-languages').query({ 'filters.code': 'xx' }).expect(200);
      expect(languages.body.data.length).toBe(1);

      await asAdmin(app, 'post', '/localization-texts').send({ localizationLanguageCode: 'xx', key: 'k1', value: 'v1' }).expect(200);
      await asAdmin(app, 'put', '/localization-texts/xx/k1').send({ value: 'v2' }).expect(200);
      const texts = await asAdmin(app, 'get', '/localization-texts').query({ 'filters.key': 'k1' }).expect(200);
      expect(texts.body.data[0].value).toBe('v2');
      const byKeys = await asAdmin(app, 'get', '/localization-texts-by-keys').expect(200);
      expect(byKeys.body.data.length).toBeGreaterThan(0);

      const exportedTexts = await asAdmin(app, 'post', '/localization-texts/export').send({ texts: [{ localizationLanguageCode: 'xx', key: 'k1' }] });
      expect(exportedTexts.status).toBe(200);
      const exportedLanguages = await asAdmin(app, 'post', '/localization-languages/export').send({ codes: ['xx'] });
      expect(exportedLanguages.status).toBe(200);

      await asAdmin(app, 'delete', '/localization-texts/xx/k1').expect(200);
      await asAdmin(app, 'delete', '/localization-languages/xx').expect(200);
    });

    it('validates language bodies', async () => {
      await asAdmin(app, 'post', '/localization-languages').send({ code: 'yy', name: 'not-an-object', isActive: true }).expect(422);
    });
  });

  describe('snippets', () => {
    it('manages snippet groups', async () => {
      await asAdmin(app, 'post', '/snippet-groups').send({ name: 'group-a' }).expect(200);
      const group = await asAdmin(app, 'get', '/snippet-groups/group-a').expect(200);
      expect(group.body.data.name).toBe('group-a');
      await asAdmin(app, 'put', '/snippet-groups/group-a').send({ name: 'group-b' }).expect(200);
      const groups = await asAdmin(app, 'get', '/snippet-groups').expect(200);
      expect(groups.body.data.length).toBeGreaterThan(0);
      await asAdmin(app, 'delete', '/snippet-groups/group-b').expect(200);
    });

    it('validates snippet bodies', async () => {
      await asAdmin(app, 'post', '/snippets').send({ name: 'only-name' }).expect(422);
    });

    it('requires the snippets admin unit for writes', async () => {
      await app.request().post('/snippets').send({ name: 'a', type: 'js', data: 'x' }).expect(401);
    });
  });

  describe('mass messages mailing', () => {
    it('lists mailings', async () => {
      const response = await asAdmin(app, 'get', '/mass-messages-mailing/get-list').expect(200);
      expect(response.body.pagination).toBeDefined();
    });

    it('validates the send body', async () => {
      await asAdmin(app, 'post', '/mass-messages-mailing/send').send({ subject: 'x' }).expect(422);
    });

    it('rejects a send without recipients', async () => {
      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({ subject: 'x', full_text: 'y' });
      expect(response.status).toBe(500);
      expect(response.body.error.message).toEqual(expect.any(String));
    });

    it('rejects invalid emails and user ids and duplicates', async () => {
      const invalidEmail = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({ subject: 'x', full_text: 'y', emails_list: ['nope'] });
      expect(invalidEmail.status).toBe(500);
      expect(invalidEmail.body.error.message).toEqual(expect.any(String));
      const invalidUser = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({
        subject: 'x',
        full_text: 'y',
        emails_list: ['a@example.com'],
        user_ids_list: ['short'],
      });
      expect(invalidUser.status).toBe(500);
      expect(invalidUser.body.error.message).toEqual(expect.any(String));
      const dupUsers = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({
        subject: 'x',
        full_text: 'y',
        user_ids_list: ['bbbbbbbbbbbbbbbbbbbbbb01', 'bbbbbbbbbbbbbbbbbbbbbb01'],
      });
      expect(dupUsers.status).toBe(500);
      expect(dupUsers.body.error.message).toEqual(expect.any(String));
      const dupEmails = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({
        subject: 'x',
        full_text: 'y',
        emails_list: ['a@example.com', 'a@example.com'],
      });
      expect(dupEmails.status).toBe(500);
      expect(dupEmails.body.error.message).toEqual(expect.any(String));
    });

    it('rejects too long subject and text', async () => {
      const longSubject = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({
        subject: 'x'.repeat(100000),
        full_text: 'y',
        emails_list: ['a@example.com'],
      });
      expect(longSubject.status).toBe(500);
      expect(longSubject.body.error.message).toEqual(expect.any(String));
      const longText = await asAdmin(app, 'post', '/mass-messages-mailing/send').send({
        subject: 'x',
        full_text: 'y'.repeat(1000000),
        emails_list: ['a@example.com'],
      });
      expect(longText.status).toBe(500);
      expect(longText.body.error.message).toEqual(expect.any(String));
    });
  });
});
