import { TestApp } from './test-app';

const AUTH_HEADER = 'Basic dGVzdDE6dGVzdA==';
const DEFAULT_CONTAINER_ID = 1;

describe('Signatures Controller', () => {
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
      .query({ name: 'signed-file.txt', container_id: DEFAULT_CONTAINER_ID })
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'text/plain')
      .send('content to sign')
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

  describe('POST /signatures', () => {
    it('should require auth', async () => {
      await app.request().post('/signatures').expect(401);
    });

    it('should create a signature for a file', async () => {
      const response = await app
        .request()
        .post('/signatures')
        .set('Authorization', AUTH_HEADER)
        .send({
          fileId,
          signedData: Buffer.from('signed-data').toString('base64'),
          signature: Buffer.from('signature-bytes').toString('base64'),
          certificate: Buffer.from('certificate-bytes').toString('base64'),
        })
        .expect(200);

      expect(response.body.data).toMatchObject({ fileId });
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /signatures/:id', () => {
    it('should find a signature by id', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/signatures')
        .set('Authorization', AUTH_HEADER)
        .send({
          fileId,
          signedData: Buffer.from('a').toString('base64'),
          signature: Buffer.from('b').toString('base64'),
          certificate: Buffer.from('c').toString('base64'),
        })
        .expect(200);

      const response = await app.request().get(`/signatures/${id}`).set('Authorization', AUTH_HEADER).expect(200);

      expect(response.body.data).toMatchObject({ id, fileId });
    });

    it('should return 404 for an unknown id', async () => {
      await app.request().get('/signatures/00000000-0000-0000-0000-000000000000').set('Authorization', AUTH_HEADER).expect(404);
    });
  });

  describe('DELETE /signatures/:id', () => {
    it('should delete a signature', async () => {
      const {
        body: {
          data: { id },
        },
      } = await app
        .request()
        .post('/signatures')
        .set('Authorization', AUTH_HEADER)
        .send({
          fileId,
          signedData: Buffer.from('a').toString('base64'),
          signature: Buffer.from('b').toString('base64'),
          certificate: Buffer.from('c').toString('base64'),
        })
        .expect(200);

      await app.request().delete(`/signatures/${id}`).set('Authorization', AUTH_HEADER).expect(200);
      await app.request().get(`/signatures/${id}`).set('Authorization', AUTH_HEADER).expect(404);
    });
  });
});
