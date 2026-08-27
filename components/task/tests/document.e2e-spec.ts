import { TestApp } from './test-app';

import { prepareFixtures, DOCUMENT_FIXTURES } from './fixtures';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Document', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Insert fixture data into the database
    await prepareFixtures(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('GET /documents/:id/sign', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .get(`/documents/${documentId}/sign`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .get(`/documents/${nonExistentDocumentId}/sign`)
        .set('token', jwt)
        .expect(404);
    });

    it('should return data for sign when document exists', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const userId = '61efddaa351d6219eee09043';
      
      // Get the test document from fixtures
      const testDocument = DOCUMENT_FIXTURES.find(doc => doc.id === '12345678-1234-1234-1234-123456789abc');

      // Mock user info endpoint
      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId, role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      // Mock file info request
      app.nock('https://filestorage.liquio.local')
        .get('/files/test-file-id-123/info')
        .reply(200, { 
          data: {
            id: 'test-file-id-123',
            name: 'test-file.pdf',
            size: 1024,
            contentType: 'application/pdf',
            hash: {
              sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
              sha1: 'abcdef1234567890abcdef12'
            }
          }
        });

      // Mock ASIC manifest creation
      app.nock('https://filestorage.liquio.local')
        .post('/files/asicmanifest')
        .reply(200, {
          data: {
            id: 'test-asic-manifest-id',
            name: 'manifest.xml',
            contentType: 'application/xml'
          }
        });

      // Mock P7S signature request (first attempt)
      app.nock('https://filestorage.liquio.local')
        .get('/files/test-asic-manifest-id/p7s?as_file=true')
        .replyWithError(new Error('P7S signature not available'));

      // Mock ASIC manifest file download (fallback)
      app.nock('https://filestorage.liquio.local')
        .get('/files/test-asic-manifest-id')
        .reply(200, 'mock-asic-manifest-content');

      // Test the endpoint
      await app
        .request()
        .get(`/documents/${testDocument.id}/sign`)
        .set('token', jwt)
        .expect(200)
        .expect(response => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /documents/:id/sign', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .post(`/documents/${documentId}/sign`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${nonExistentDocumentId}/sign`)
        .set('token', jwt)
        .expect(404);
    });

    // TODO: Add tests for sign method
  });

  describe('GET /documents/:id/sign_p7s', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .get(`/documents/${documentId}/sign_p7s`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .get(`/documents/${nonExistentDocumentId}/sign_p7s`)
        .set('token', jwt)
        .expect(404);
    });

    // TODO: Add tests for getDataForSignP7s method
  });

  describe('POST /documents/:id/sign_p7s', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .post(`/documents/${documentId}/sign_p7s`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${nonExistentDocumentId}/sign_p7s`)
        .set('token', jwt)
        .expect(404);
    });

    // TODO: Add tests for signP7s method
  });

  describe('GET /documents/:id/sign_additional_p7s', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .get(`/documents/${documentId}/sign_additional_p7s`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .get(`/documents/${nonExistentDocumentId}/sign_additional_p7s`)
        .set('token', jwt)
        .expect(404);
    });

    // TODO: Add tests for getAdditionalDataForSignP7s method
  });

  describe('POST /documents/:id/sign_additional_p7s', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .post(`/documents/${documentId}/sign_additional_p7s`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${nonExistentDocumentId}/sign_additional_p7s`)
        .set('token', jwt)
        .expect(404);
    });

    // TODO: Add tests for signAdditionalP7s method
  });

  describe('POST /documents/:id/multisign/check', () => {
    it('should fail without auth', async () => {
      const documentId = DOCUMENT_FIXTURES[0].id;

      await app
        .request()
        .post(`/documents/${documentId}/multisign/check`)
        .expect(401);
    });

    it('should fail if document not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');
      const nonExistentDocumentId = '00000000-0000-0000-0000-000000000000';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${nonExistentDocumentId}/multisign/check`)
        .set('token', jwt)
        .expect(404);
    });

    it('should fail if multisign is not defined', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      const documentId = DOCUMENT_FIXTURES[0].id;

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${documentId}/multisign/check`)
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual({ data: { check: true, message: 'multisignCheck is not defined' }});
        });
    });

    it('should fail if isEnabled function returns false', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      const documentId = '780dbe17-20fb-4934-84d9-542e44c19d9e';

      app.nockId
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: '61efddaa351d6219eee09043', role: 'individual', services: { eds: { data: { pem: 'PEM' } } } });

      await app
        .request()
        .post(`/documents/${documentId}/multisign/check`)
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual({ data: { check: true, message: 'disabled by isEnabled parameter' }});
        });
    });
  });

  describe('GET /documents/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id');
    });
  });

  describe('PUT /documents/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/documents/:id');
    });
  });

  describe('POST /documents/:id/pdf', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/pdf');
    });
  });

  describe('POST /documents/:id/large-pdf', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/large-pdf');
    });
  });

  describe('GET /documents/:id/pdf', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/pdf');
    });
  });

  describe('GET /documents/:id/asic', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/asic');
    });
  });

  describe('POST /documents/:id/attachments', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/attachments');
    });
  });

  describe('GET /documents/:id/attachments/zip', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/attachments/zip');
    });
  });

  describe('GET /documents/:id/attachments/:attachment_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/attachments/:attachment_id');
    });
  });

  describe('DELETE /documents/:id/attachments/:attachment_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/documents/:id/attachments/:attachment_id');
    });
  });

  describe('POST /documents/:id/continue-sign', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/continue-sign');
    });
  });

  describe('DELETE /documents/:id/sign', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/documents/:id/sign');
    });
  });

  describe('POST /documents/:id/singlesign/check', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/singlesign/check');
    });
  });

  describe('GET /documents/:id/encrypt', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/encrypt');
    });
  });

  describe('POST /documents/:id/encrypt', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/encrypt');
    });
  });

  describe('POST /documents/:id/sign-rejection', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/sign-rejection');
    });
  });

  describe('GET /documents/:id/workflow_files', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/workflow_files');
    });
  });

  describe('GET /documents/:id/workflow_files_direct', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/documents/:id/workflow_files_direct');
    });
  });

  describe('POST /documents/:id/calc', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/calc');
    });
  });

  describe('POST /documents/:id/prepare', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/prepare');
    });
  });

  describe('POST /documents/:id/validate', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/validate');
    });
  });

  describe('POST /documents/:id/external-reader/check', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/external-reader/check');
    });
  });

  describe('POST /documents/:id/external-reader/check/async', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/documents/:id/external-reader/check/async');
    });
  });

  describe('PUT /documents/:id/verified-user-info', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/documents/:id/verified-user-info');
    });
  });

  describe('GET /files/:download_token', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/files/:download_token');
    });
  });

  describe('POST /files', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/files');
    });
  });
});
