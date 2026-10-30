import nock from 'nock';

import { TestApp, TEST_AUTH_HEADER } from './test-app';

const PREVIEW_SERVER = 'http://preview.e2e.test:8080';
const DEFAULT_CONTAINER_ID = 1;
const PREVIEW_BYTES = Buffer.from('GIF89a-fake-preview');

describe('Preview service', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({ preview: { server: PREVIEW_SERVER, timeout: 2000 } });
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
    nock.cleanAll();
    nock.restore();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const uploadImage = (query: Record<string, string> = {}) =>
    app
      .request()
      .post('/files')
      .query({ name: 'image.png', container_id: DEFAULT_CONTAINER_ID, ...query })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'image/png')
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  it('should require auth for the preview download', async () => {
    await app.request().get('/files/00000000-0000-0000-0000-000000000000/preview').expect(401);
  });

  it('stores a generated preview and serves it', async () => {
    let extension: string | undefined;
    const scope = nock(PREVIEW_SERVER)
      .post('/preview')
      .query((q) => {
        extension = q.file_extension as string;
        return true;
      })
      .reply(200, PREVIEW_BYTES);
    const upload = await uploadImage().expect(200);
    expect(scope.isDone()).toBe(true);
    expect(extension).toBe('png');

    const response = await app.request().get(`/files/${upload.body.data.id}/preview`).set('Authorization', TEST_AUTH_HEADER).expect(200);
    expect(response.headers['content-type']).toContain('image/gif');
    expect(Buffer.from(response.body)).toEqual(PREVIEW_BYTES);
  });

  it('skips the preview service when with_preview=false', async () => {
    const scope = nock(PREVIEW_SERVER).post('/preview').query(true).reply(200, PREVIEW_BYTES);
    const upload = await uploadImage({ with_preview: 'false' }).expect(200);
    expect(scope.isDone()).toBe(false);
    await app.request().get(`/files/${upload.body.data.id}/preview`).set('Authorization', TEST_AUTH_HEADER).expect(404);
  });

  it('skips the preview service for content types that do not allow it', async () => {
    const scope = nock(PREVIEW_SERVER).post('/preview').query(true).reply(200, PREVIEW_BYTES);
    const upload = await app
      .request()
      .post('/files')
      .query({ name: 'plain.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', TEST_AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send('fake text')
      .expect(200);
    expect(scope.isDone()).toBe(false);
    await app.request().get(`/files/${upload.body.data.id}/preview`).set('Authorization', TEST_AUTH_HEADER).expect(404);
  });

  it('returns 404 for the preview of an unknown file', async () => {
    await app.request().get('/files/00000000-0000-0000-0000-000000000000/preview').set('Authorization', TEST_AUTH_HEADER).expect(404);
  });

  it('keeps the file when the preview service times out', async () => {
    nock(PREVIEW_SERVER).post('/preview').query(true).delay(4000).reply(200, PREVIEW_BYTES);
    await uploadImage().expect(200);
    const [, logData] = await app.log.waitForLog('preview-generating-error');
    expect(logData.error).toBeDefined();
  });

  describe('GET /test/ping_with_auth?health_check=true', () => {
    const healthCheck = () =>
      app.request().get('/test/ping_with_auth').query({ health_check: 'true' }).set('Authorization', TEST_AUTH_HEADER).expect(200);

    it('reports the preview service as healthy', async () => {
      nock(PREVIEW_SERVER)
        .get('/test/ping')
        .reply(200, { data: { message: 'pong' } }, { version: '99.0.0', customer: '1', environment: '0' });
      const response = await healthCheck();
      expect(response.body.data.previewServiceResponse).toBe(true);
    });

    it('reports version and customer mismatches', async () => {
      nock(PREVIEW_SERVER)
        .get('/test/ping')
        .reply(200, { data: { message: 'pong' } }, { version: '0.0.0', customer: '7', environment: '3' });
      const response = await healthCheck();
      expect(response.body.data.previewServiceResponse).toBe(false);
      expect(response.body.data.previewServiceMeta).toMatchObject({ customerEqual: false, environmentEqual: false });
    });

    it('reports a failed check when the preview service answers with a server error', async () => {
      nock(PREVIEW_SERVER).get('/test/ping').reply(500, 'boom');
      const response = await healthCheck();
      expect(response.body.data.previewServiceResponse).toBe(false);
    });

    it('reports a failed check when the preview service answers with invalid JSON', async () => {
      nock(PREVIEW_SERVER).get('/test/ping').reply(200, 'not json', { 'content-type': 'text/plain' });
      const response = await healthCheck();
      expect(response.body.data.previewServiceResponse).toBe(false);
    });
  });
});
