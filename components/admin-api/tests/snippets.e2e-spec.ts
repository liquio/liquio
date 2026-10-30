import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits, textParser } from './fixtures/auth';

describe('Snippets controllers', () => {
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

  it('answers 404 for missing snippets and groups', async () => {
    await asAdmin(app, 'get', '/snippets/987654').expect(404);
    await asAdmin(app, 'put', '/snippets/987654').send({ name: 'n', data: 'd' }).expect(404);
    await asAdmin(app, 'delete', '/snippets/987654').expect(404);
    await asAdmin(app, 'put', '/snippet-groups/missing-group').send({ name: 'x' }).expect(404);
    await asAdmin(app, 'delete', '/snippet-groups/missing-group').expect(404);
  });

  it('manages a snippet lifecycle', async () => {
    await asAdmin(app, 'post', '/snippet-groups').send({ name: 'life-group' }).expect(200);
    const created = await asAdmin(app, 'post', '/snippets')
      .send({ name: 'Snippet one', type: 'function', data: 'return 1;', snippetGroupName: 'life-group' })
      .expect(200);
    const id = created.body.data.id;
    expect(id).toBeDefined();

    const one = await asAdmin(app, 'get', `/snippets/${id}`).expect(200);
    expect(one.body.data.name).toBe('Snippet one');
    const all = await asAdmin(app, 'get', '/snippets').expect(200);
    expect(all.body.data.length).toBeGreaterThan(0);

    await asAdmin(app, 'put', `/snippets/${id}`).send({ name: 'Snippet two', data: 'return 2;' }).expect(200);
    const deleted = await asAdmin(app, 'delete', `/snippets/${id}`).expect(200);
    expect(deleted.body.data.deletedCount).toBe(1);
    await asAdmin(app, 'delete', '/snippet-groups/life-group').expect(200);
  });

  it('exports and imports snippets', async () => {
    await asAdmin(app, 'post', '/snippet-groups').send({ name: 'io-group' }).expect(200);
    const created = await asAdmin(app, 'post', '/snippets')
      .send({ name: 'Io snippet', type: 'control', data: 'x', snippetGroupName: 'io-group' })
      .expect(200);
    const id = created.body.data.id;

    const exported = await asAdmin(app, 'post', '/snippets/export')
      .send({ idList: [id] })
      .buffer(true)
      .parse(textParser);
    expect(exported.status).toBe(200);
    expect(typeof exported.body).toBe('string');
    await asAdmin(app, 'post', '/snippets/export').send({ idList: [] }).expect(422);

    const payload = JSON.stringify([
      { id, name: 'Imported', type: 'control', data: 'y', meta: {}, snippetGroup: { name: 'io-group' } },
      { name: 'Imported no group', type: 'function', data: 'z', meta: {} },
    ]);
    const merged = await asAdmin(app, 'post', '/snippets/import').set('Content-Type', 'text/plain').send(payload);
    expect(merged.status).toBe(200);
    expect(merged.body.data.snippetsCreatedCount).toBeDefined();

    const rewritten = await asAdmin(app, 'post', '/snippets/import?isRewrite=true').set('Content-Type', 'text/plain').send(payload);
    expect(rewritten.status).toBe(200);
    expect(rewritten.body.data.snippetsDeletedCount).toBeDefined();

    const invalid = await asAdmin(app, 'post', '/snippets/import').set('Content-Type', 'text/plain').send('not json');
    expect(invalid.status).toBe(400);
  });
});
