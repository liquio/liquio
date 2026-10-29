import nock from 'nock';

import { TestApp, TEST_AUTH_HEADER } from './test-app';

const KEYSTONE = 'http://keystone.e2e.test:5000';
const SWIFT = 'http://swift.e2e.test:8080/v1/AUTH_fake';
const SWIFT_HOST = 'http://swift.e2e.test:8080';
const CONTAINER = 'e2e-container';
const OBJECT_PATH = new RegExp(`^/v1/AUTH_fake/${CONTAINER}/files/(D\\d{8}/)?[0-9a-f-]{36}$`);
const CONTAINER_PATH = `/v1/AUTH_fake/${CONTAINER}`;
const DEFAULT_CONTAINER_ID = 1;
const CONTENT = 'fake openstack content';
const FAKE_TOKEN = 'fake-subject-token';

const authBody = (catalog: any[]) => ({ token: { catalog } });
const swiftCatalog = [
  {
    name: 'swift',
    endpoints: [
      { interface: 'admin', url: 'http://unused', id: 'a' },
      { interface: 'public', url: SWIFT, id: 'e2e-id' },
    ],
  },
];

describe('Files with the openstack provider', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({
      providers: {
        activeProvider: 'openstack',
        list: {
          openstack: {
            authVersion: 3,
            server: KEYSTONE,
            routes: { getTokens: '/v3/auth/tokens' },
            timeout: 5000,
            tenantName: 'e2e',
            account: { login: 'fake-login', password: 'fake-password', domainId: 'default', projectId: 'fake-project' },
            container: CONTAINER,
            isFilesCanBeDeleted: true,
            authCacheTtl: 60000,
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

  // Keystone answers once; the provider caches the tenant token for authCacheTtl.
  const mockAuth = () => nock(KEYSTONE).post('/v3/auth/tokens').reply(201, authBody(swiftCatalog), { 'x-subject-token': FAKE_TOKEN });

  const upload = async () => {
    nock(SWIFT_HOST).put(OBJECT_PATH).reply(201, '', { etag: 'fake-etag' });
    const response = await app
      .request()
      .post('/files')
      .query({ name: 'swift.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send(CONTENT)
      .expect(200);
    return response.body.data.id as string;
  };

  it('should require auth', async () => {
    await app.request().post('/files').expect(401);
    await app.request().get('/test/file_provider').expect(401);
  });

  it('authenticates in Keystone and uploads the object with the token', async () => {
    const keystone = mockAuth();
    let token: string | undefined;
    const swift = nock(SWIFT_HOST)
      .put(OBJECT_PATH)
      .reply(function () {
        token = this.req.headers['x-auth-token'] as string;
        return [201, '', { etag: 'fake-etag' }];
      });
    await app
      .request()
      .post('/files')
      .query({ name: 'swift.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send(CONTENT)
      .expect(200);
    expect(keystone.isDone()).toBe(true);
    expect(swift.isDone()).toBe(true);
    expect(token).toBe(FAKE_TOKEN);
  });

  it('downloads the object from swift using the cached token', async () => {
    const id = await upload();
    const swift = nock(SWIFT_HOST).get(OBJECT_PATH).reply(200, CONTENT);
    const response = await app.request().get(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(swift.isDone()).toBe(true);
    expect(response.text).toBe(CONTENT);
  });

  it('fails when the object is missing in swift', async () => {
    const id = await upload();
    nock(SWIFT_HOST).get(OBJECT_PATH).times(2).reply(404, 'Not Found');
    const response = await app.request().get(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('copies the file through the provider', async () => {
    const id = await upload();
    nock(SWIFT_HOST).get(OBJECT_PATH).reply(200, CONTENT);
    nock(SWIFT_HOST).put(OBJECT_PATH).reply(201, '', { etag: 'copy-etag' });
    const response = await app.request().post(`/files/${id}/copy`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(response.body.data.id).not.toBe(id);
  });

  it('deletes the object and the DB row', async () => {
    const id = await upload();
    const swift = nock(SWIFT_HOST).delete(OBJECT_PATH).reply(204);
    await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(swift.isDone()).toBe(true);
  });

  it('treats an already absent object as deleted', async () => {
    const id = await upload();
    nock(SWIFT_HOST).delete(OBJECT_PATH).reply(404, 'Not Found');
    await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER).expect(200);
  });

  it('keeps the DB row when swift fails to delete the object', async () => {
    const id = await upload();
    nock(SWIFT_HOST).delete(OBJECT_PATH).reply(500, 'boom');
    const response = await app.request().delete(`/files/${id}`).set('Authorization', TEST_AUTH_HEADER);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  describe('GET /test/file_provider', () => {
    it('returns the container usage', async () => {
      nock(SWIFT_HOST).head(CONTAINER_PATH).reply(204, '', { 'x-container-bytes-used': '2500000000', 'x-container-object-count': '7' });
      const response = await app.request().get('/test/file_provider').set('Authorization', TEST_AUTH_HEADER).expect(200);
      expect(response.body.data).toEqual({ gigabytesUsedCount: '2.50', gigabytesUsedCountRound: 3 });
    });

    it('returns the object count on request', async () => {
      nock(SWIFT_HOST).head(CONTAINER_PATH).reply(204, '', { 'x-container-bytes-used': '1000000000', 'x-container-object-count': '7' });
      const response = await app
        .request()
        .get('/test/file_provider')
        .query({ count_object: 'true' })
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200);
      expect(response.body.data).toMatchObject({ gigabytesUsedCount: '1.00', objectCount: '7' });
    });
  });
});
