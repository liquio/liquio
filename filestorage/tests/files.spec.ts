import { TestApp } from './test-app';

const AUTH_HEADER = 'Basic dGVzdDE6dGVzdA==';
const DEFAULT_CONTAINER_ID = 1;

describe('Files Controller', () => {
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

  describe('POST /files', () => {
    it('should require auth', async () => {
      await app.request().post('/files').expect(401);
    });

    it('should upload a file and store it directly in the DB (no active provider)', async () => {
      const response = await app
        .request()
        .post('/files')
        .query({ name: 'hello.txt', container_id: DEFAULT_CONTAINER_ID, description: 'A test file' })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('Hello, world!')
        .expect(200);

      expect(response.body.data).toMatchObject({ name: 'hello.txt', contentType: 'text/plain', description: 'A test file' });
      expect(response.body.data.id).toBeDefined();
    });

    it('should gracefully continue without a preview when the preview service is unreachable', async () => {
      const response = await app
        .request()
        .post('/files')
        .query({ name: 'image.png', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'image/png')
        .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        .expect(200);

      expect(response.body.data).toMatchObject({ name: 'image.png', contentType: 'image/png' });

      const [, logData] = await app.log.waitForLog('preview-generating-error');
      expect(logData.error).toBeDefined();
    });

    it('should reject an empty file', async () => {
      await app
        .request()
        .post('/files')
        .query({ name: 'empty.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('')
        .expect(400);
    });
  });

  describe('GET /files/:id', () => {
    it('should download the uploaded file content', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'download-me.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('downloadable content')
        .expect(200);

      const response = await app.request().get(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.text).toBe('downloadable content');
    });

    it('should return 404 for an unknown id', async () => {
      await app.request().get('/files/00000000-0000-0000-0000-000000000000').set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('GET /files/:id/info', () => {
    it('should return file metadata without its data', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'info-me.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('some content')
        .expect(200);

      const response = await app.request().get(`/files/${id}/info`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'info-me.txt' });
      expect(response.body.data.data).toBeUndefined();
    });
  });

  describe('PUT /files/:id', () => {
    it('should update file metadata', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'before-update.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('content')
        .expect(200);

      const response = await app
        .request()
        .put(`/files/${id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'after-update.txt', description: 'Updated' })
        .expect(200);

      expect(response.body.data).toMatchObject({ id, name: 'after-update.txt', description: 'Updated' });
    });
  });

  describe('DELETE /files/:id', () => {
    it('should delete a file', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'to-delete.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('content')
        .expect(200);

      await app.request().delete(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(200);
      await app.request().get(`/files/${id}`).set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('POST /files/:id/copy', () => {
    it('should copy a file', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/files')
        .query({ name: 'to-copy.txt', container_id: DEFAULT_CONTAINER_ID })
        .set('Authorization', AUTH_HEADER)
        .set('Content-Type', 'text/plain')
        .send('copy me')
        .expect(200);

      const response = await app.request().post(`/files/${id}/copy`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data.id).not.toBe(id);
      expect(response.body.data).toMatchObject({ name: 'to-copy.txt' });
    });
  });
});
