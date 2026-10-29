import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';

const FILESTORAGE = 'http://filestorage:8080';
const OTHER_ADMIN = 'dddddddddddddddddddddd02';
const MISSING_ID = '00000000-0000-4000-8000-0000000000aa';

describe('File library controller', () => {
  let app: TestApp;
  let folderId: string;
  let fileItemId: string;
  let publicSlug: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
    // Support admin unit only: can list but has no ownership of the items created below.
    await app.model('unit').update({ members: ['dddddddddddddddddddddd02'] }, { where: { id: 1000000043 } });
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

  it('requires authentication', async () => {
    await app.request().get('/file-library/items').expect(401);
    await app.request().post('/file-library/folders').send({ name: 'x' }).expect(401);
  });

  it('validates folder and upload input', async () => {
    await asAdmin(app, 'post', '/file-library/folders').send({}).expect(422);
    await asAdmin(app, 'post', '/file-library/folders').send({ name: 'x', visibility: 'secret' }).expect(422);
    await asAdmin(app, 'post', '/file-library/files').expect(422);
    await asAdmin(app, 'get', '/file-library/items/not-a-uuid').expect(422);
  });

  it('creates folders, nested folders and rejects unknown parents', async () => {
    const created = await asAdmin(app, 'post', '/file-library/folders').send({ name: 'Documents', visibility: 'private' }).expect(201);
    folderId = created.body.data.id;
    expect(created.body.data).toMatchObject({ type: 'folder', name: 'Documents' });

    const nested = await asAdmin(app, 'post', '/file-library/folders').send({ name: 'Nested', parent_id: folderId }).expect(201);
    expect(nested.body.data.parentId).toBe(folderId);

    const missingParent = await asAdmin(app, 'post', '/file-library/folders').send({ name: 'Orphan', parent_id: MISSING_ID });
    expect(missingParent.status).toBe(404);
  });

  it('uploads a file through filestorage', async () => {
    app
      .nock(FILESTORAGE)
      .post('/files')
      .query((query) => query.name === 'report.txt' && query.with_preview === 'true')
      .reply(200, { data: { id: '3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f' } });
    const created = await asAdmin(app, 'post', '/file-library/files')
      .query({ name: 'report.txt', parent_id: folderId })
      .set('Content-Type', 'text/plain')
      .send('hello world')
      .expect(201);
    fileItemId = created.body.data.id;
    expect(created.body.data).toMatchObject({ type: 'file', name: 'report.txt', fileId: '3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f' });
  });

  it('rejects an empty upload and a failed filestorage response', async () => {
    const empty = await asAdmin(app, 'post', '/file-library/files').query({ name: 'empty.txt' }).set('Content-Type', 'text/plain');
    expect(empty.status).toBe(400);
    expect(empty.body.error.message).toBe('Can not upload empty file.');

    app.nock(FILESTORAGE).post('/files').query(true).reply(200, { data: {} });
    const failed = await asAdmin(app, 'post', '/file-library/files')
      .query({ name: 'broken.txt', with_preview: false })
      .set('Content-Type', 'text/plain')
      .send('content');
    expect(failed.status).toBe(500);
  });

  it('lists the root and folder children', async () => {
    const root = await asAdmin(app, 'get', '/file-library/items').expect(200);
    expect(root.body.data.some((item) => item.id === folderId)).toBe(true);

    const children = await asAdmin(app, 'get', '/file-library/items').query({ parent_id: folderId }).expect(200);
    expect(children.body.data.some((item) => item.id === fileItemId)).toBe(true);
  });

  it('reads an item with its grants and answers 404 for a missing one', async () => {
    const item = await asAdmin(app, 'get', `/file-library/items/${fileItemId}`).expect(200);
    expect(item.body.data.id).toBe(fileItemId);
    expect(Array.isArray(item.body.data.grants)).toBe(true);
    await asAdmin(app, 'get', `/file-library/items/${MISSING_ID}`).expect(404);
  });

  it('updates, moves and renames an item', async () => {
    const renamed = await asAdmin(app, 'put', `/file-library/items/${fileItemId}`).send({ name: 'report-v2.txt' }).expect(200);
    expect(renamed.body.data.name).toBe('report-v2.txt');

    const moved = await asAdmin(app, 'put', `/file-library/items/${fileItemId}`).send({ parent_id: null });
    expect(moved.status).toBe(200);

    const toMissing = await asAdmin(app, 'put', `/file-library/items/${fileItemId}`).send({ parent_id: MISSING_ID });
    expect(toMissing.status).toBe(404);
  });

  it('replaces grants and validates them', async () => {
    const granted = await asAdmin(app, 'put', `/file-library/items/${fileItemId}/access`)
      .send({ grants: [{ subjectType: 'user', subjectId: OTHER_ADMIN, permission: 'read', inherit: true }] })
      .expect(200);
    expect(granted.body.data.length).toBe(1);

    await asAdmin(app, 'put', `/file-library/items/${fileItemId}/access`)
      .send({ grants: [{ subject_type: 'planet', permission: 'read' }] })
      .expect(422);

    const granted2 = await asAdmin(app, 'put', `/file-library/items/${fileItemId}/access`)
      .send({ grants: [{ subject_type: 'unit', subject_id: 1000003, permission: 'write' }] })
      .expect(200);
    expect(granted2.body.data.length).toBe(1);
  });

  it('forbids managing items of another user that has no manage grant', async () => {
    const response = await asAdmin(app, 'delete', `/file-library/items/${fileItemId}`, OTHER_ADMIN);
    expect([403]).toContain(response.status);
  });

  it('downloads and previews a file by proxying filestorage', async () => {
    app
      .nock(FILESTORAGE)
      .get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f')
      .reply(200, 'hello world', { 'content-type': 'text/plain', 'content-disposition': 'attachment; filename="a.txt"' });
    const download = await asAdmin(app, 'get', `/file-library/items/${fileItemId}/download`).expect(200);
    expect(download.text).toBe('hello world');
    expect(download.headers['content-disposition']).toContain('a.txt');

    app.nock(FILESTORAGE).get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f/preview').reply(200, 'PREVIEW', { 'content-type': 'image/png' });
    const preview = await asAdmin(app, 'get', `/file-library/items/${fileItemId}/preview`).expect(200);
    expect(preview.headers['content-type']).toContain('image/png');

    app.nock(FILESTORAGE).get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f').reply(404, 'gone', { 'content-type': 'text/plain' });
    await asAdmin(app, 'get', `/file-library/items/${fileItemId}/download`).expect(404);
  });

  it('refuses to download folders and missing files', async () => {
    const folder = await asAdmin(app, 'get', `/file-library/items/${folderId}/download`);
    expect(folder.status).toBe(404);
    const missing = await asAdmin(app, 'get', `/file-library/items/${MISSING_ID}/preview`);
    expect(missing.status).toBe(404);
  });

  it('publishes a file with a public link and serves it without authentication', async () => {
    const link = await asAdmin(app, 'post', `/file-library/items/${fileItemId}/public-link`)
      .send({ expires_at: '2099-01-01T00:00:00.000Z' })
      .expect(200);
    publicSlug = link.body.data.publicSlug;
    expect(link.body.data.publicUrl).toContain(`/file-library/public/${publicSlug}/`);

    app.nock(FILESTORAGE).get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f').reply(200, 'public body', { 'content-type': 'text/plain' });
    const byName = await app.request().get(`/file-library/public/${publicSlug}/report-v2.txt`).expect(200);
    expect(byName.text).toBe('public body');
    expect(byName.headers['content-disposition']).toContain('inline; filename="report-v2.txt"');

    app.nock(FILESTORAGE).get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f').reply(200, 'public body', { 'content-type': 'text/plain' });
    await app.request().get(`/file-library/public/${publicSlug}`).expect(200);

    app.nock(FILESTORAGE).get('/files/3f0c9b1e-1d2a-4c5b-8e6f-7a8b9c0d1e2f/preview').reply(200, 'PREVIEW', { 'content-type': 'image/png' });
    await app.request().get(`/file-library/public/${publicSlug}/preview`).expect(200);
  });

  it('answers 404 for unknown or invalid public slugs', async () => {
    await app.request().get('/file-library/public/0123456789abcdef0123/x.txt').expect(404);
    await app.request().get('/file-library/public/0123456789abcdef0123/preview').expect(404);
    await app.request().get('/file-library/public/short').expect(422);
  });

  it('answers 404 for creating a public link of a missing item and disables a public link', async () => {
    const missing = await asAdmin(app, 'post', `/file-library/items/${MISSING_ID}/public-link`).send({});
    expect(missing.status).toBeGreaterThanOrEqual(400);

    const disabled = await asAdmin(app, 'delete', `/file-library/items/${fileItemId}/public-link`).expect(200);
    expect(disabled.body.data).toBeDefined();

    await app.request().get(`/file-library/public/${publicSlug}/report-v2.txt`).expect(404);

    const missingDisable = await asAdmin(app, 'delete', `/file-library/items/${MISSING_ID}/public-link`);
    expect(missingDisable.status).toBeGreaterThanOrEqual(400);
  });

  it('deletes items softly', async () => {
    const removed = await asAdmin(app, 'delete', `/file-library/items/${fileItemId}`).expect(200);
    expect(removed.body.data).toHaveProperty('deletedRowsCount');
    await asAdmin(app, 'get', `/file-library/items/${fileItemId}`).expect(404);
  });
});
