import { TestApp } from './test-app';

const AUTH_HEADER = 'Basic dGVzdDE6dGVzdA==';
const DEFAULT_CONTAINER_ID = 1;

describe('P7S Signatures Controller', () => {
  let app: TestApp;
  let fileId: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    const {
      body: {
        data: { id },
      },
    } = await app
      .request()
      .post('/files')
      .query({ name: 'p7s-file.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send('content to p7s-sign')
      .expect(200);
    fileId = id;
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('POST /p7s_signatures', () => {
    it('should require auth', async () => {
      await app.request().post('/p7s_signatures').expect(401);
    });

    it('should create a P7S signature for a file', async () => {
      const response = await app
        .request()
        .post('/p7s_signatures')
        .set('Authorization', AUTH_HEADER)
        .send({ fileId, p7s: Buffer.from('p7s-bytes').toString('base64') })
        .expect(200);

      expect(response.body.data).toMatchObject({ fileId });
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /p7s_signatures/:fileId/info', () => {
    it('should find P7S signature info by file id', async () => {
      await app
        .request()
        .post('/p7s_signatures')
        .set('Authorization', AUTH_HEADER)
        .send({ fileId, p7s: Buffer.from('p7s-bytes').toString('base64') })
        .expect(200);

      const response = await app.request().get(`/p7s_signatures/${fileId}/info`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data).toMatchObject({ fileId });
    });

    it('should return 404 when no P7S signature exists for the file', async () => {
      await app.request().get('/p7s_signatures/00000000-0000-0000-0000-000000000000/info').set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('DELETE /p7s_signatures/file/:fileId', () => {
    it('should delete a P7S signature by file id', async () => {
      await app
        .request()
        .post('/p7s_signatures')
        .set('Authorization', AUTH_HEADER)
        .send({ fileId, p7s: Buffer.from('p7s-bytes').toString('base64') })
        .expect(200);

      await app.request().delete(`/p7s_signatures/file/${fileId}`).set('Authorization', AUTH_HEADER).expect(200);
      await app.request().get(`/p7s_signatures/${fileId}/info`).set('Authorization', AUTH_HEADER).expect(404);
    });
  });
});
