import { TestApp, TEST_AUTH_HEADER } from './test-app';

describe('Templates Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
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

  const create = (body: any) => app.request().post('/template').set('Authorization', TEST_AUTH_HEADER).send(body);

  describe('POST /template', () => {
    it('rejects requests without Basic auth', async () => {
      await app.request().post('/template').send({ type: 'sms', text: 'x', title: 'x' }).expect(401);
    });

    it.each([[{ text: 'x', title: 't' }], [{ type: 'push', text: 'x', title: 't' }], [{ type: '  ', text: 'x', title: 't' }]])(
      'answers 400 for a missing or unsupported type (%j)',
      async (body) => {
        const res = await create(body).expect(400);
        expect(res.body.message).toBe("Type must be 'sms' or 'email'");
      },
    );

    it('answers 400 for an empty text', async () => {
      const res = await create({ type: 'sms', text: ' ', title: 't' }).expect(400);
      expect(res.body.message).toBe('Text id empty');
    });

    it('answers 500 when the template can not be stored (no title)', async () => {
      await create({ type: 'sms', text: 'hello' }).expect(500);
    });

    it('creates a template', async () => {
      const res = await create({ type: 'email', text: 'Hello ${name}', title: 'Greeting' }).expect(200);
      expect(res.body).toMatchObject({ type: 'email', text: 'Hello ${name}', title: 'Greeting' });
      expect(res.body.template_id).toEqual(expect.any(Number));
    });
  });

  describe('GET /template', () => {
    let id: number;

    beforeAll(async () => {
      const res = await create({ type: 'sms', text: 'Code ${code} for ${name}', title: 'Code' });
      id = res.body.template_id;
    });

    it('returns a single template with its params', async () => {
      const res = await app.request().get('/template').query({ template_id: id }).expect(200);
      expect(res.body).toMatchObject({ template_id: id, type: 'sms', params: ['code', 'name'] });
    });

    it('returns a list when no filter is given', async () => {
      const res = await app.request().get('/template').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns an empty list for an unknown template', async () => {
      const res = await app.request().get('/template').query({ template_id: 999999 }).expect(200);
      expect(res.body).toEqual([]);
    });

    it('answers 400 when both template_id and template_ids are passed', async () => {
      await app.request().get(`/template?template_id=${id}&template_ids=${id}`).expect(400);
    });

    it('answers 500 for a non-numeric template_id filter', async () => {
      await app.request().get('/template').query({ template_id: 'abc' }).expect(500);
    });

    it('filters by template_ids', async () => {
      const other = (await create({ type: 'sms', text: 'other', title: 'Other' })).body.template_id;
      const res = await app.request().get(`/template?template_ids=${id}&template_ids=${other}`).expect(200);
      expect(res.body.map((t: any) => t.template_id).sort()).toEqual([id, other].sort());
    });
  });

  describe('PUT /template/:template_id', () => {
    it('answers 400 for invalid payloads', async () => {
      const put = (body: any) => app.request().put('/template/1').set('Authorization', TEST_AUTH_HEADER).send(body);
      await put({ text: 'x' }).expect(400);
      await put({ type: 'sms', text: '' }).expect(400);
    });

    it('updates a template', async () => {
      const created = await create({ type: 'sms', text: 'old', title: 'Old' });
      const id = created.body.template_id;
      const res = await app
        .request()
        .put(`/template/${id}`)
        .set('Authorization', TEST_AUTH_HEADER)
        .send({ type: 'email', text: 'new', title: 'New' })
        .expect(200);
      expect(res.body[1][0]).toMatchObject({ template_id: id, type: 'email', text: 'new', title: 'New' });
    });

    it('answers 500 for a non-numeric id', async () => {
      await app.request().put('/template/abc').set('Authorization', TEST_AUTH_HEADER).send({ type: 'sms', text: 'x', title: 't' }).expect(500);
    });
  });

  describe('DELETE /template/:template_id', () => {
    it('requires Basic auth', async () => {
      await app.request().delete('/template/1').expect(401);
    });

    it('deletes a template', async () => {
      const created = await create({ type: 'sms', text: 'tmp', title: 'Tmp' });
      const id = created.body.template_id;
      await app.request().delete(`/template/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
      const res = await app.request().get('/template').query({ template_id: id }).expect(200);
      expect(res.body).toEqual([]);
    });

    it('answers 500 for a non-numeric id', async () => {
      await app.request().delete('/template/abc').set('Authorization', TEST_AUTH_HEADER).expect(500);
    });
  });

  describe('POST /prepareMessageByTemplateId', () => {
    let id: number;
    const prepare = (body: any) => app.request().post('/prepareMessageByTemplateId').send(body);

    beforeAll(async () => {
      id = (await create({ type: 'sms', text: 'Hi ${name}, code ${code}', title: 'Prep' })).body.template_id;
    });

    it('answers 400 for a missing template id, non-numeric id and empty params', async () => {
      await prepare({ params: { a: 1 } }).expect(400);
      await prepare({ template_id: 'abc', params: { a: 1 } }).expect(400);
      await prepare({ template_id: id }).expect(400);
      await prepare({ template_id: id, params: {} }).expect(400);
    });

    it('answers 404 for an unknown template', async () => {
      await prepare({ template_id: 999999, params: { a: 1 } }).expect(404);
    });

    it('answers 400 when a template param is missing', async () => {
      const res = await prepare({ template_id: id, params: { name: 'Ann' } }).expect(400);
      expect(res.body.message).toBe('Param code required for this template');
    });

    it('fills the template params', async () => {
      const res = await prepare({ template_id: id, params: { name: 'Ann', code: 1234 } }).expect(200);
      expect(res.body).toEqual({ message: 'Hi Ann, code 1234' });
    });

    it('returns a template without params as is', async () => {
      const plain = (await create({ type: 'sms', text: 'plain', title: 'Plain' })).body.template_id;
      const res = await prepare({ template_id: plain, params: { any: 1 } }).expect(200);
      expect(res.body).toEqual({ message: 'plain' });
    });

    it('answers 500 for a non-numeric id that passes the number check', async () => {
      await prepare({ template_id: '1e400', params: { a: 1 } }).expect(500);
    });
  });

  describe('POST /import/template', () => {
    // importTemplates never ends its transaction on the early-return paths; release those connections so the pool can close.
    const openTransactions: any[] = [];
    beforeAll(() => {
      const { connection } = require('../src/models/DB');
      const original = connection.transaction.bind(connection);
      jest.spyOn(connection, 'transaction').mockImplementation(async (...args: any[]) => {
        const transaction = await original(...args);
        openTransactions.push(transaction);
        return transaction;
      });
    });
    afterEach(async () => {
      for (const transaction of openTransactions.splice(0)) {
        if (!transaction.finished) await transaction.rollback();
      }
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });

    const imp = (body: any) => app.request().post('/import/template').set('Authorization', TEST_AUTH_HEADER).send(body);

    it('requires Basic auth', async () => {
      await app.request().post('/import/template').send({}).expect(401);
    });

    it('answers 500 for a body without dataToImport', async () => {
      await imp({}).expect(500);
    });

    it('imports templates with new ids, then rewrites and clones existing ones', async () => {
      const base = 7000;
      const first = await imp({
        dataToImport: [
          { template_id: base, type: 'sms', text: 'a', title: 'A' },
          { template_id: base + 1, type: 'sms', text: 'b', title: 'B' },
        ],
        rewriteTemplateIds: [],
      }).expect(200);
      expect(first.body).toEqual({ createdTemplatesCount: 2 });

      const second = await imp({
        dataToImport: [
          { template_id: base, type: 'sms', text: 'a2', title: 'A2' },
          { template_id: base + 1, type: 'sms', text: 'b2', title: 'B2' },
          { template_id: base + 2, type: 'email', text: 'c', title: 'C' },
        ],
        rewriteTemplateIds: [base],
      }).expect(200);
      expect(second.body).toEqual({ createdTemplatesCount: 2, updatedTemplatesCount: 1 });

      const rewritten = await app.request().get('/template').query({ template_id: base }).expect(200);
      expect(rewritten.body.text).toBe('a2');
    });

    it('answers 400 for rewriteTemplateIds that do not match existing templates', async () => {
      const id = (await create({ type: 'sms', text: 'x', title: 'X' })).body.template_id;
      await imp({
        dataToImport: [
          { template_id: id, type: 'sms', text: 'x', title: 'X' },
          { template_id: 880001, type: 'sms', text: 'y', title: 'Y' },
        ],
        rewriteTemplateIds: [880001],
      }).expect(400);
    });
  });
});
