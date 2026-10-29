import { TestApp, TEST_AUTH_HEADER } from './test-app';

const DEFAULT_CONTAINER_ID = 1;
const MISSING_ID = '00000000-0000-0000-0000-000000000000';
const WRONG_AUTH = 'Basic d3Jvbmc6dG9rZW4=';
const b64 = (value: string) => Buffer.from(value).toString('base64');

describe('Signatures and P7S signatures CRUD', () => {
  let app: TestApp;
  let fileId: string;

  const auth = (req: any) => req.set('Authorization', TEST_AUTH_HEADER);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    const response = await auth(
      app.request().post('/files').query({ name: 'crud.txt', container_id: DEFAULT_CONTAINER_ID }).set('Content-Type', 'text/plain'),
    )
      .send('fake content to sign')
      .expect(200);
    fileId = response.body.data.id;
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  describe('auth', () => {
    it.each([
      ['get', '/signatures'],
      ['get', `/signatures/${MISSING_ID}`],
      ['put', `/signatures/${MISSING_ID}`],
      ['delete', `/signatures/${MISSING_ID}`],
      ['delete', `/signatures/file/${MISSING_ID}`],
      ['get', `/p7s_signatures/${MISSING_ID}`],
      ['put', `/p7s_signatures/${MISSING_ID}`],
      ['delete', `/p7s_signatures/${MISSING_ID}`],
      ['get', `/files/${MISSING_ID}/p7s`],
      ['post', '/files/asicmanifest'],
      ['get', '/files'],
    ])('should reject %s %s without a token and with a wrong token', async (method, url) => {
      await (app.request() as any)[method](url).expect(401);
      await (app.request() as any)[method](url).set('Authorization', WRONG_AUTH).expect(401);
    });
  });

  describe('signatures', () => {
    let signatureId: string;

    it('should create a signature', async () => {
      const response = await auth(app.request().post('/signatures'))
        .send({ fileId, signedData: b64('data'), signature: b64('sig'), certificate: b64('cert'), meta: { a: 1 } })
        .expect(200);
      signatureId = response.body.data.id;
      expect(response.body.data).toMatchObject({ fileId });
    });

    it('should fail to create a signature for an unknown file', async () => {
      await auth(app.request().post('/signatures'))
        .send({ fileId: MISSING_ID, signedData: b64('data'), signature: b64('sig'), certificate: b64('cert') })
        .expect(500);
    });

    it('should list signatures filtered by file', async () => {
      const response = await auth(app.request().get('/signatures')).query({ file_id: fileId, limit: 5 }).expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should find a signature by id', async () => {
      const response = await auth(app.request().get(`/signatures/${signatureId}`)).expect(200);
      expect(response.body.data.id).toBe(signatureId);
    });

    it('should return 404 for an unknown signature', async () => {
      await auth(app.request().get(`/signatures/${MISSING_ID}`)).expect(404);
    });

    it('should update a signature', async () => {
      await auth(app.request().put(`/signatures/${signatureId}`))
        .send({ fileId, signedData: b64('data2'), signature: b64('sig2'), certificate: b64('cert2'), meta: { a: 2 } })
        .expect(200);
    });

    it('should fail to update an unknown signature', async () => {
      await auth(app.request().put(`/signatures/${MISSING_ID}`))
        .send({ fileId, signedData: b64('d'), signature: b64('s'), certificate: b64('c') })
        .expect(500);
    });

    it('should delete a signature by id and report an unknown one', async () => {
      await auth(app.request().delete(`/signatures/${signatureId}`)).expect(200);
      await auth(app.request().delete(`/signatures/${signatureId}`)).expect(500);
    });

    it('should delete signatures by file id and report none to delete', async () => {
      await auth(app.request().post('/signatures'))
        .send({ fileId, signedData: b64('data'), signature: b64('sig'), certificate: b64('cert') })
        .expect(200);
      await auth(app.request().delete(`/signatures/file/${fileId}`)).expect(200);
      await auth(app.request().delete(`/signatures/file/${fileId}`)).expect(500);
    });
  });

  describe('p7s signatures', () => {
    let p7sId: string;

    it('should create and update the same P7S signature for a file', async () => {
      const first = await auth(app.request().post('/p7s_signatures'))
        .send({ fileId, p7s: b64('p7s-one'), meta: { n: 1 } })
        .expect(200);
      p7sId = first.body.data.id;
      const second = await auth(app.request().post('/p7s_signatures'))
        .send({ fileId, p7s: b64('p7s-two'), meta: { n: 2 } })
        .expect(200);
      expect(second.body.data.id).toBe(p7sId);
    });

    it('should fail to create a P7S signature for an unknown file', async () => {
      await auth(app.request().post('/p7s_signatures'))
        .send({ fileId: MISSING_ID, p7s: b64('p7s') })
        .expect(500);
    });

    it('should find a P7S signature by id', async () => {
      const response = await auth(app.request().get(`/p7s_signatures/${p7sId}`)).expect(200);
      expect(response.body.data.id).toBe(p7sId);
    });

    it('should return 404 for an unknown P7S signature', async () => {
      await auth(app.request().get(`/p7s_signatures/${MISSING_ID}`)).expect(404);
    });

    it('should update a P7S signature by id', async () => {
      await auth(app.request().put(`/p7s_signatures/${p7sId}`))
        .send({ p7s: b64('p7s-three'), meta: { n: 3 } })
        .expect(200);
    });

    it('should fail to update an unknown P7S signature', async () => {
      await auth(app.request().put(`/p7s_signatures/${MISSING_ID}`))
        .send({ p7s: b64('x') })
        .expect(500);
    });

    describe('GET /files/:id/p7s', () => {
      it('should return the P7S entity', async () => {
        const response = await auth(app.request().get(`/files/${fileId}/p7s`)).expect(200);
        expect(response.body.data).toMatchObject({ fileName: 'crud.txt', p7sContentType: expect.any(String) });
      });

      it('should return the P7S as a file and as base64', async () => {
        const asFile = await auth(app.request().get(`/files/${fileId}/p7s`))
          .query({ as_file: 'true' })
          .expect(200);
        expect(asFile.headers['content-disposition']).toContain('crud');
        const asBase64 = await auth(app.request().get(`/files/${fileId}/p7s`))
          .query({ as_file: 'true', as_base64: 'true' })
          .expect(200);
        expect(asBase64.text.length).toBeGreaterThan(0);
      });

      it('should answer 409 when the last signer is the same user', async () => {
        await auth(app.request().put(`/p7s_signatures/${p7sId}`))
          .send({ p7s: b64('p7s-four'), meta: { user: { userId: 'fake-user' }, signerList: [{ userId: 'fake-signer' }] } })
          .expect(200);
        await auth(app.request().get(`/files/${fileId}/p7s`))
          .query({ not_last_user_id: 'fake-user' })
          .expect(409);
        await auth(app.request().get(`/files/${fileId}/p7s`))
          .query({ not_last_user_id: 'fake-signer' })
          .expect(409);
      });

      it('should return 404 when the file has no P7S signature', async () => {
        await auth(app.request().get(`/files/${MISSING_ID}/p7s`)).expect(404);
      });
    });

    it('should delete a P7S signature by id and report an unknown one', async () => {
      await auth(app.request().delete(`/p7s_signatures/${p7sId}`)).expect(200);
      await auth(app.request().delete(`/p7s_signatures/${p7sId}`)).expect(500);
    });

    it('should report no P7S signature to delete by file id', async () => {
      await auth(app.request().delete(`/p7s_signatures/file/${fileId}`)).expect(500);
    });
  });

  describe('files listing and ASiC manifest', () => {
    it('should list files filtered by name and container', async () => {
      const response = await auth(app.request().get('/files')).query({ name: 'crud.txt', container_id: DEFAULT_CONTAINER_ID, limit: 5 }).expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should create an ASiC manifest file', async () => {
      const response = await auth(app.request().post('/files/asicmanifest'))
        .query({ description: 'manifest', meta: Buffer.from(JSON.stringify({ k: 'v' })).toString('base64') })
        .send({ filesIds: [fileId], dataObject: { fake: true } })
        .expect(200);
      expect(response.body.data).toMatchObject({ name: 'asicmanifest.xml' });
    });

    it('should reject an ASiC manifest request with unparsable meta', async () => {
      await auth(app.request().post('/files/asicmanifest'))
        .query({ meta: '%%%not-base64-json' })
        .send({ filesIds: [fileId] })
        .expect(400);
    });

    it('should answer 404 for an ASiC manifest of an unknown file', async () => {
      await auth(app.request().post('/files/asicmanifest'))
        .send({ filesIds: [MISSING_ID] })
        .expect(404);
    });
  });
});
