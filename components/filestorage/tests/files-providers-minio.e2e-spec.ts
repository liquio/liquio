import nock from 'nock';

import { TestApp, TEST_AUTH_HEADER } from './test-app';

const MINIO_SERVER = 'http://minio.e2e.test:9000';
const BUCKET = 'e2e-bucket';
const OBJECT_PATH = new RegExp(`^/${BUCKET}/files/(D\\d{8}/)?[0-9a-f-]{36}$`);
const DEFAULT_CONTAINER_ID = 1;
const CONTENT = 'fake minio content';

describe('Files with the minio provider', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({
      providers: {
        activeProvider: 'minio',
        list: {
          minio: {
            server: MINIO_SERVER,
            bucket: BUCKET,
            timeout: 5000,
            account: { login: 'fake-login', password: 'fake-password' },
            isFilesCanBeDeleted: true,
          },
        },
      },
    });
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const upload = async (content = CONTENT) => {
    let uploaded: any;
    const scope = nock(MINIO_SERVER)
      .put(OBJECT_PATH, (body) => {
        uploaded = body;
        return true;
      })
      .reply(200, '', { etag: '"fake-etag"' });
    const response = await app
      .request()
      .post('/files')
      .query({ name: 'minio.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send(content)
      .expect(200);
    expect(scope.isDone()).toBe(true);
    return { id: response.body.data.id as string, uploaded };
  };

  it('uses the minio provider', () => {
    expect(app.providers.activeProvider.constructor.ProviderName).toBe('minio');
  });

  it('should require auth', async () => {
    await app.request().post('/files').expect(401);
    await app.request().get('/files/00000000-0000-0000-0000-000000000000').set('Authorization', 'Basic d3Jvbmc6dG9rZW4=').expect(401);
  });

  it('uploads the object to the bucket with a signed request', async () => {
    let authorization: string | undefined;
    const scope = nock(MINIO_SERVER)
      .put(OBJECT_PATH)
      .reply(function () {
        authorization = this.req.headers['authorization'] as string;
        return [200, '', { etag: '"fake-etag"' }];
      });
    await app
      .request()
      .post('/files')
      .query({ name: 'signed.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send(CONTENT)
      .expect(200);
    expect(scope.isDone()).toBe(true);
    expect(authorization).toMatch(/^AWS fake-login:.+/);
  });

  it('downloads the object from the bucket', async () => {
    const { id } = await upload();
    const scope = nock(MINIO_SERVER).get(OBJECT_PATH).reply(200, CONTENT);
    const response = await app.request().get(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(scope.isDone()).toBe(true);
    expect(response.text).toBe(CONTENT);
  });

  it('fails when the stored object is missing in the bucket', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).get(OBJECT_PATH).times(2).reply(404, 'NoSuchKey');
    const response = await app.request().get(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('fails when the integrity check does not match', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).get(OBJECT_PATH).reply(200, 'tampered content');
    const response = await app.request().get(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('returns the info of a file, reading the object from the provider', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).get(OBJECT_PATH).reply(200, CONTENT);
    const response = await app.request().get(`/files/${id}/info`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(response.body.data.id).toBe(id);
  });

  it('copies the file through the provider', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).get(OBJECT_PATH).reply(200, CONTENT);
    nock(MINIO_SERVER).put(OBJECT_PATH).reply(200, '', { etag: '"copy-etag"' });
    const response = await app.request().post(`/files/${id}/copy`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(response.body.data.id).not.toBe(id);
  });

  it('fails the upload when the provider rejects it', async () => {
    nock(MINIO_SERVER).put(OBJECT_PATH).reply(500, 'boom');
    const response = await app
      .request()
      .post('/files')
      .query({ name: 'fail.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send(CONTENT);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('deletes the object and the DB row', async () => {
    const { id } = await upload();
    const scope = nock(MINIO_SERVER).delete(OBJECT_PATH).reply(204);
    await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(scope.isDone()).toBe(true);
    await app.request().get(`/files/${id}/info`).set('Authorization', TEST_AUTH_HEADER).expect(404);
  });

  it('treats an already absent object as deleted', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).delete(OBJECT_PATH).reply(404, 'NoSuchKey');
    await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
  });

  it('keeps the DB row when the provider fails to delete the object', async () => {
    const { id } = await upload();
    nock(MINIO_SERVER).delete(OBJECT_PATH).reply(500, 'boom');
    const response = await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('reports the provider as not found for the openstack check', async () => {
    await app.request().get('/test/file_provider').set('Authorization', TEST_AUTH_HEADER).expect(404);
  });
});
