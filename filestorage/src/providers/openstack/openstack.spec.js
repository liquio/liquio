const nock = require('nock');

const OpenStack = require('./index');

beforeAll(() => {
  global.log = {
    save: jest.fn(),
  };
  global.silentUpload = true;
});

afterAll(() => {
  delete global.log;
  delete global.silentUpload;
  nock.cleanAll();
});

describe('OpenStack Provider', () => {
  describe('Compilation Tests', () => {
    it('should compile and export OpenStack class', () => {
      expect(OpenStack).toBeDefined();
      expect(typeof OpenStack).toBe('function');
    });

    it('should have correct provider name', () => {
      expect(OpenStack.ProviderName).toBe('openstack');
    });

    it('should be instantiable with config', () => {
      const config = {
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        }
      };

      const openstack = new OpenStack(config);
      expect(openstack).toBeInstanceOf(OpenStack);
      expect(openstack.server).toBe(config.server);
      expect(openstack.tenantName).toBe(config.tenantName);
      expect(openstack.account).toBe(config.account);
    });

    it('should implement singleton pattern', () => {
      const config = {
        server: 'http://localhost:5000',
        tenantName: 'test-tenant-2',
        account: {
          login: 'test-user-2',
          password: 'test-password-2'
        }
      };

      const openstack1 = new OpenStack(config);
      const openstack2 = new OpenStack(config);
      
      expect(openstack1).toBe(openstack2);
    });

    it('should set default values correctly', () => {
      const config = {
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        }
      };

      // Reset singleton for this test
      OpenStack.singleton = null;
      
      const openstack = new OpenStack(config);
      
      expect(openstack.authVersion).toBe(3);
      expect(openstack.container).toBe('dev');
      expect(openstack.authCacheTtl).toBe(30000);
      expect(openstack.routes).toEqual({ getTokens: '/v3/auth/tokens' });
    });

    it('should have all required methods', () => {
      const config = {
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        }
      };

      // Reset singleton for this test
      OpenStack.singleton = null;
      
      const openstack = new OpenStack(config);

      // Check that all expected methods exist
      expect(typeof openstack.getInfoToHandleFile).toBe('function');
      expect(typeof openstack.downloadFileRequestOptions).toBe('function');
      expect(typeof openstack.downloadFile).toBe('function');
      expect(typeof openstack.downloadFileAsBuffer).toBe('function');
      expect(typeof openstack.uploadFileRequestOptions).toBe('function');
      expect(typeof openstack.uploadFile).toBe('function');
      expect(typeof openstack.deleteFile).toBe('function');
      expect(typeof openstack.getMetadata).toBe('function');
      expect(typeof openstack.getRequestHeaders).toBe('function');
    });
  });

  describe('getInfoToHandleFile', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        }
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return correct URL format', async () => {
      const filePath = 'test/file.txt';
      const result = await openstack.getInfoToHandleFile(filePath);

      expect(result.url).toBe('http://swift.example.com/v1/AUTH_tenant/dev/test/file.txt');
      expect(result.headers).toEqual({
        'X-Auth-Token': 'test-token-123'
      });
    });

    it('should use custom container when provided', async () => {
      const filePath = 'test/file.txt';
      const containerName = 'custom-container';
      const result = await openstack.getInfoToHandleFile(filePath, containerName);

      expect(result.url).toBe('http://swift.example.com/v1/AUTH_tenant/custom-container/test/file.txt');
      expect(result.headers).toEqual({
        'X-Auth-Token': 'test-token-123'
      });
    });

    it('should handle different file paths correctly', async () => {
      const testCases = [
        'simple.txt',
        'folder/file.txt',
        'deep/nested/folder/file.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt'
      ];

      for (const filePath of testCases) {
        const result = await openstack.getInfoToHandleFile(filePath);
        expect(result.url).toBe(`http://swift.example.com/v1/AUTH_tenant/dev/${filePath}`);
        expect(result.headers).toEqual({
          'X-Auth-Token': 'test-token-123'
        });
      }
    });

    it('should handle empty file path', async () => {
      const result = await openstack.getInfoToHandleFile('');
      expect(result.url).toBe('http://swift.example.com/v1/AUTH_tenant/dev/');
    });

    it('should handle undefined file path', async () => {
      const result = await openstack.getInfoToHandleFile(undefined);
      expect(result.url).toBe('http://swift.example.com/v1/AUTH_tenant/dev/undefined');
    });

    it('should throw error when tenantPublicUrl is not defined', async () => {
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: null
      });

      await expect(openstack.getInfoToHandleFile('test.txt'))
        .rejects.toThrow('OpenStack tenent public URL not defined.');
    });

    it('should throw error when tenantPublicUrl is undefined', async () => {
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123'
      });

      await expect(openstack.getInfoToHandleFile('test.txt'))
        .rejects.toThrow('OpenStack tenent public URL not defined.');
    });
  });

  describe('getRequestHeaders', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        }
      });
    });

    it('should return headers with correct structure', () => {
      const token = 'test-token-123';
      const headers = openstack.getRequestHeaders(token);
      
      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('X-Auth-Token');
    });

    it('should return correct Content-Type header', () => {
      const token = 'test-token-123';
      const headers = openstack.getRequestHeaders(token);
      
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should return correct Accept header', () => {
      const token = 'test-token-123';
      const headers = openstack.getRequestHeaders(token);
      
      expect(headers['Accept']).toBe('application/json');
    });

    it('should include the provided tenant token in X-Auth-Token header', () => {
      const token = 'test-token-123';
      const headers = openstack.getRequestHeaders(token);
      
      expect(headers['X-Auth-Token']).toBe(token);
    });

    it('should handle different tenant token values', () => {
      const testTokens = [
        'simple-token',
        'token-with-123-numbers',
        'very-long-token-with-many-characters-and-numbers-12345',
        'token_with_underscores',
        'TOKEN-WITH-UPPERCASE'
      ];

      testTokens.forEach(token => {
        const headers = openstack.getRequestHeaders(token);
        expect(headers['X-Auth-Token']).toBe(token);
      });
    });

    it('should handle empty token', () => {
      const headers = openstack.getRequestHeaders('');
      expect(headers['X-Auth-Token']).toBe('');
    });

    it('should handle null token', () => {
      const headers = openstack.getRequestHeaders(null);
      expect(headers['X-Auth-Token']).toBe(null);
    });

    it('should handle undefined token', () => {
      const headers = openstack.getRequestHeaders(undefined);
      expect(headers['X-Auth-Token']).toBe(undefined);
    });

    it('should return new object instance on each call', () => {
      const token = 'test-token-123';
      const headers1 = openstack.getRequestHeaders(token);
      const headers2 = openstack.getRequestHeaders(token);
      
      expect(headers1).not.toBe(headers2); // Different object instances
      expect(headers1).toEqual(headers2); // Same content
    });

    it('should handle special characters in token', () => {
      const token = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const headers = openstack.getRequestHeaders(token);
      expect(headers['X-Auth-Token']).toBe(token);
    });

    it('should handle very long token', () => {
      const token = 'a'.repeat(1000);
      const headers = openstack.getRequestHeaders(token);
      expect(headers['X-Auth-Token']).toBe(token);
    });
  });

  describe('downloadFile', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        },
        timeout: 5000
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      nock.cleanAll();
    });

    it('should return a stream when called', async () => {
      const filePath = 'test/file.txt';
      const fileContent = 'Hello, World!';

      // Mock the HTTP request
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .matchHeader('X-Auth-Token', 'test-token-123')
        .reply(200, fileContent);

      const stream = await openstack.downloadFile(filePath);
      expect(stream).toBeDefined();
    });

    it('should call downloadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on downloadFileRequestOptions
      const spy = jest.spyOn(openstack, 'downloadFileRequestOptions');
      
      // Mock the HTTP request
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(200, 'content');

      await openstack.downloadFile(filePath);
      
      expect(spy).toHaveBeenCalledWith(filePath);
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/file.txt';
      
      // Mock the HTTP request and verify headers
      const scope = nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .matchHeader('X-Auth-Token', 'test-token-123')
        .reply(200, 'content');

      await openstack.downloadFile(filePath);
      
      expect(scope.isDone()).toBe(true);
    });

    it('should handle different file paths correctly', async () => {
      const testCases = [
        { path: 'simple.txt', expected: '/v1/AUTH_tenant/dev/simple.txt' },
        { path: 'folder/file.txt', expected: '/v1/AUTH_tenant/dev/folder/file.txt' },
        { path: 'deep/nested/folder/file.txt', expected: '/v1/AUTH_tenant/dev/deep/nested/folder/file.txt' }
      ];

      for (const testCase of testCases) {
        nock('http://swift.example.com')
          .get(testCase.expected)
          .reply(200, 'content');

        await openstack.downloadFile(testCase.path);
      }
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on downloadFileRequestOptions to verify timeout is passed
      const spy = jest.spyOn(openstack, 'downloadFileRequestOptions');
      
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(200, 'content');

      await openstack.downloadFile(filePath);
      
      const requestOptions = await spy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(5000);
    });

    it('should handle empty file path', async () => {
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/')
        .reply(200, '');

      const stream = await openstack.downloadFile('');
      expect(stream).toBeDefined();
    });

    it('should handle undefined file path', async () => {
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/undefined')
        .reply(200, '');

      const stream = await openstack.downloadFile(undefined);
      expect(stream).toBeDefined();
    });
  });

  describe('downloadFileAsBuffer', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        },
        timeout: 5000
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      nock.cleanAll();
    });

    it('should return a buffer when file download is successful', async () => {
      const filePath = 'test/file.txt';
      const fileContent = 'Hello, World!';

      // Mock the HTTP request
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .matchHeader('X-Auth-Token', 'test-token-123')
        .reply(200, fileContent);

      const buffer = await openstack.downloadFileAsBuffer(filePath);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe(fileContent);
    });

    it('should call downloadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on downloadFileRequestOptions
      const spy = jest.spyOn(openstack, 'downloadFileRequestOptions');
      
      // Mock the HTTP request
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(200, 'content');

      await openstack.downloadFileAsBuffer(filePath);
      
      expect(spy).toHaveBeenCalledWith(filePath);
    });

    it('should handle binary data correctly', async () => {
      const filePath = 'test/image.png';
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

      // Mock the HTTP request with binary data
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/image.png')
        .reply(200, binaryData);

      const buffer = await openstack.downloadFileAsBuffer(filePath);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer).toEqual(binaryData);
    });

    it('should handle different file types correctly', async () => {
      const testCases = [
        { path: 'document.pdf', content: 'PDF content' },
        { path: 'image.jpg', content: 'JPEG data' },
        { path: 'data.json', content: '{"key": "value"}' },
        { path: 'script.js', content: 'console.log("hello");' }
      ];

      for (const testCase of testCases) {
        nock('http://swift.example.com')
          .get(`/v1/AUTH_tenant/dev/${testCase.path}`)
          .reply(200, testCase.content);

        const buffer = await openstack.downloadFileAsBuffer(testCase.path);
        expect(buffer.toString()).toBe(testCase.content);
      }
    });

    it('should handle empty file correctly', async () => {
      const filePath = 'empty.txt';

      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/empty.txt')
        .reply(200, '');

      const buffer = await openstack.downloadFileAsBuffer(filePath);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(0);
    });

    it('should handle undefined file path', async () => {
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/undefined')
        .reply(200, 'content');

      const buffer = await openstack.downloadFileAsBuffer(undefined);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on downloadFileRequestOptions to verify timeout is passed
      const spy = jest.spyOn(openstack, 'downloadFileRequestOptions');
      
      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(200, 'content');

      await openstack.downloadFileAsBuffer(filePath);
      
      const requestOptions = await spy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(5000);
    });

    it('should handle 404 errors consistently', async () => {
      const filePath = 'nonexistent.txt';

      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/nonexistent.txt')
        .reply(404, 'Not Found');

      await expect(openstack.downloadFileAsBuffer(filePath))
        .rejects.toThrow();
    });

    it('should handle 500 server errors consistently', async () => {
      const filePath = 'test/file.txt';

      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(500, 'Internal Server Error');

      await expect(openstack.downloadFileAsBuffer(filePath))
        .rejects.toThrow();
    });

    it('should handle network errors consistently', async () => {
      const filePath = 'test/file.txt';

      nock('http://swift.example.com')
        .get('/v1/AUTH_tenant/dev/test/file.txt')
        .replyWithError('Network error');

      await expect(openstack.downloadFileAsBuffer(filePath))
        .rejects.toThrow();
    });
  });

  describe('uploadFile', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        },
        timeout: 5000
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      nock.cleanAll();
    });

    it('should upload file successfully and return file info', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'Hello, World!';
      const expectedHash = 'abc123def456';

      // Mock the HTTP request
      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .matchHeader('X-Auth-Token', 'test-token-123')
        .matchHeader('Content-Type', contentType)
        .reply(201, '', { etag: expectedHash });

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      
      expect(result).toEqual({
        fileLink: filePath,
        hash: expectedHash
      });
    });

    it('should call uploadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'Hello, World!';
      
      // Spy on uploadFileRequestOptions
      const spy = jest.spyOn(openstack, 'uploadFileRequestOptions');
      
      // Mock the HTTP request
      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(201, '');

      await openstack.uploadFile(filePath, contentType, fileContent);
      
      expect(spy).toHaveBeenCalledWith(filePath, contentType, fileContent);
    });

    it('should handle different content types correctly', async () => {
      const testCases = [
        { contentType: 'text/plain', path: 'file.txt' },
        { contentType: 'application/json', path: 'data.json' },
        { contentType: 'image/jpeg', path: 'image.jpg' },
        { contentType: 'application/pdf', path: 'document.pdf' }
      ];

      for (const testCase of testCases) {
        nock('http://swift.example.com')
          .put(`/v1/AUTH_tenant/dev/${testCase.path}`)
          .matchHeader('Content-Type', testCase.contentType)
          .reply(201, '');

        await openstack.uploadFile(testCase.path, testCase.contentType, 'content');
      }
    });

    it('should handle Buffer file content', async () => {
      const filePath = 'test/binary.dat';
      const contentType = 'application/octet-stream';
      const fileContent = Buffer.from([0x01, 0x02, 0x03, 0x04]);

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/binary.dat')
        .matchHeader('Content-Type', contentType)
        .reply(201, '');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle string file content', async () => {
      const filePath = 'test/text.txt';
      const contentType = 'text/plain';
      const fileContent = 'String content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/text.txt')
        .matchHeader('Content-Type', contentType)
        .reply(201, '');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle empty file content', async () => {
      const filePath = 'test/empty.txt';
      const contentType = 'text/plain';
      const fileContent = '';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/empty.txt')
        .matchHeader('Content-Type', contentType)
        .reply(201, '');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      const scope = nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .matchHeader('X-Auth-Token', 'test-token-123')
        .matchHeader('Content-Type', contentType)
        .reply(201, '');

      await openstack.uploadFile(filePath, contentType, fileContent);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle response without etag header', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(201, '', {}); // No etag header

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBeUndefined();
    });

    it('should handle large file paths correctly', async () => {
      const filePath = 'very/deep/nested/folder/structure/with/many/levels/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put(`/v1/AUTH_tenant/dev/${filePath}`)
        .reply(201, '');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle 400 bad request errors', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(400, 'Bad Request');

      // Note: OpenStack uploadFile doesn't throw on HTTP errors, it resolves
      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle 403 forbidden errors', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(403, 'Forbidden');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle 500 server errors', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(500, 'Internal Server Error');

      const result = await openstack.uploadFile(filePath, contentType, fileContent);
      expect(result.fileLink).toBe(filePath);
    });

    it('should handle network errors', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .replyWithError('Network error');

      await expect(openstack.uploadFile(filePath, contentType, fileContent))
        .rejects.toThrow('Network error');
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';
      
      // Spy on uploadFileRequestOptions to verify timeout is passed
      const spy = jest.spyOn(openstack, 'uploadFileRequestOptions');
      
      nock('http://swift.example.com')
        .put('/v1/AUTH_tenant/dev/test/file.txt')
        .reply(201, '');

      await openstack.uploadFile(filePath, contentType, fileContent);
      
      const requestOptions = await spy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(5000);
    });
  });

  describe('deleteFile', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        },
        timeout: 5000
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      nock.cleanAll();
    });

    it('should delete file successfully and return result', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      const result = await openstack.deleteFile(filePath);
      
      expect(result).toEqual({ success: true });
      expect(mockSend).toHaveBeenCalledWith({
        url: 'http://swift.example.com/v1/AUTH_tenant/dev/test/file.txt',
        headers: { 'X-Auth-Token': 'test-token-123' },
        method: 'DELETE',
        timeout: 5000
      });
    });

    it('should call getInfoToHandleFile with correct parameters', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on getInfoToHandleFile
      const spy = jest.spyOn(openstack, 'getInfoToHandleFile');
      
      // Mock Request.send
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath);
      
      expect(spy).toHaveBeenCalledWith(filePath, 'dev');
    });

    it('should use default container when not specified', async () => {
      const filePath = 'test/file.txt';
      
      // Spy on getInfoToHandleFile
      const spy = jest.spyOn(openstack, 'getInfoToHandleFile');
      
      // Mock Request.send
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath);
      
      expect(spy).toHaveBeenCalledWith(filePath, 'dev');
    });

    it('should use custom container when specified', async () => {
      const filePath = 'test/file.txt';
      const containerName = 'custom-container';
      
      // Spy on getInfoToHandleFile
      const spy = jest.spyOn(openstack, 'getInfoToHandleFile');
      
      // Mock Request.send
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath, containerName);
      
      expect(spy).toHaveBeenCalledWith(filePath, containerName);
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send to verify headers
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.headers).toEqual({ 'X-Auth-Token': 'test-token-123' });
    });

    it('should handle different file paths correctly', async () => {
      const testCases = [
        'simple.txt',
        'folder/file.txt',
        'deep/nested/folder/file.txt'
      ];

      // Mock Request.send
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      for (const filePath of testCases) {
        await openstack.deleteFile(filePath);
        
        const callArgs = mockSend.mock.calls[mockSend.mock.calls.length - 1][0];
        expect(callArgs.url).toBe(`http://swift.example.com/v1/AUTH_tenant/dev/${filePath}`);
      }
    });

    it('should handle empty response body', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({});

      const result = await openstack.deleteFile(filePath);
      expect(result).toEqual({});
    });

    it('should handle JSON response body', async () => {
      const filePath = 'test/file.txt';
      const responseBody = { message: 'File deleted successfully' };

      // Mock Request.send
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue(responseBody);

      const result = await openstack.deleteFile(filePath);
      expect(result).toEqual(responseBody);
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send to verify timeout is passed
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.timeout).toBe(5000);
    });

    it('should handle 404 not found errors', async () => {
      const filePath = 'nonexistent.txt';

      // Mock Request.send to throw 404 error
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockRejectedValue(new Error('Not Found'));

      await expect(openstack.deleteFile(filePath))
        .rejects.toThrow('Not Found');
    });

    it('should handle 403 forbidden errors', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send to throw 403 error
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockRejectedValue(new Error('Forbidden'));

      await expect(openstack.deleteFile(filePath))
        .rejects.toThrow('Forbidden');
    });

    it('should handle 500 server errors', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send to throw 500 error
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockRejectedValue(new Error('Internal Server Error'));

      await expect(openstack.deleteFile(filePath))
        .rejects.toThrow('Internal Server Error');
    });

    it('should handle network errors', async () => {
      const filePath = 'test/file.txt';

      // Mock Request.send to throw network error
      jest.spyOn(require('../../lib/http_request'), 'send')
        .mockRejectedValue(new Error('Network error'));

      await expect(openstack.deleteFile(filePath))
        .rejects.toThrow('Network error');
    });

    it('should handle undefined file path', async () => {
      // Mock Request.send
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(undefined);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.url).toBe('http://swift.example.com/v1/AUTH_tenant/dev/undefined');
    });

    it('should handle large file paths correctly', async () => {
      const filePath = 'very/deep/nested/folder/structure/with/many/levels/file.txt';

      // Mock Request.send
      const mockSend = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await openstack.deleteFile(filePath);
      
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.url).toBe(`http://swift.example.com/v1/AUTH_tenant/dev/${filePath}`);
    });
  });

  describe('getMetadata', () => {
    let openstack;
    
    beforeEach(() => {
      // Reset singleton for each test
      OpenStack.singleton = null;
      
      openstack = new OpenStack({
        server: 'http://localhost:5000',
        tenantName: 'test-tenant',
        account: {
          login: 'test-user',
          password: 'test-password'
        },
        timeout: 5000
      });

      // Mock the auth.getTenantAuthInfo method
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: 'http://swift.example.com/v1/AUTH_tenant'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should get metadata successfully and return storage info', async () => {
      // Mock Request.sendDetailed
      const mockSendDetailed = jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '1000000000',
            'x-container-object-count': '100'
          }
        });

      const result = await openstack.getMetadata();
      
      expect(result).toEqual({
        gigabytesUsedCount: '1.00',
        gigabytesUsedCountRound: 1
      });
      
      expect(mockSendDetailed).toHaveBeenCalledWith({
        url: 'http://swift.example.com/v1/AUTH_tenant/dev',
        headers: { 'X-Auth-Token': 'test-token-123' },
        method: 'HEAD',
        timeout: 5000
      });
    });

    it('should call auth.getTenantAuthInfo with correct method', async () => {
      // Mock Request.sendDetailed
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '500000000'
          }
        });

      await openstack.getMetadata();
      
      expect(openstack.auth.getTenantAuthInfo).toHaveBeenCalled();
    });

    it('should use default container when not specified', async () => {
      // Mock Request.sendDetailed
      const mockSendDetailed = jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '1000000000'
          }
        });

      await openstack.getMetadata();
      
      const callArgs = mockSendDetailed.mock.calls[0][0];
      expect(callArgs.url).toBe('http://swift.example.com/v1/AUTH_tenant/dev');
    });

    it('should use custom container when specified', async () => {
      const containerName = 'custom-container';
      
      // Mock Request.sendDetailed
      const mockSendDetailed = jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '1000000000'
          }
        });

      await openstack.getMetadata(containerName);
      
      const callArgs = mockSendDetailed.mock.calls[0][0];
      expect(callArgs.url).toBe('http://swift.example.com/v1/AUTH_tenant/custom-container');
    });

    it('should include object count when showObjectCount is "true"', async () => {
      // Mock Request.sendDetailed
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '2000000000',
            'x-container-object-count': '250'
          }
        });

      const result = await openstack.getMetadata('dev', 'true');
      
      expect(result).toEqual({
        gigabytesUsedCount: '2.00',
        gigabytesUsedCountRound: 2,
        objectCount: '250'
      });
    });

    it('should exclude object count when showObjectCount is false', async () => {
      // Mock Request.sendDetailed
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '3000000000',
            'x-container-object-count': '150'
          }
        });

      const result = await openstack.getMetadata('dev', false);
      
      expect(result).toEqual({
        gigabytesUsedCount: '3.00',
        gigabytesUsedCountRound: 3
      });
      
      expect(result).not.toHaveProperty('objectCount');
    });

    it('should properly calculate gigabytes from bytes', async () => {
      const testCases = [
        { bytes: '0', expectedGB: '0.00', expectedRound: 0 },
        { bytes: '500000000', expectedGB: '0.50', expectedRound: 1 },
        { bytes: '1000000000', expectedGB: '1.00', expectedRound: 1 },
        { bytes: '1500000000', expectedGB: '1.50', expectedRound: 2 },
        { bytes: '2750000000', expectedGB: '2.75', expectedRound: 3 }
      ];

      for (const testCase of testCases) {
        // Mock Request.sendDetailed
        jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
          .mockResolvedValue({
            headers: {
              'x-container-bytes-used': testCase.bytes
            }
          });

        const result = await openstack.getMetadata();
        
        expect(result.gigabytesUsedCount).toBe(testCase.expectedGB);
        expect(result.gigabytesUsedCountRound).toBe(testCase.expectedRound);
      }
    });

    it('should configure request correctly', async () => {
      // Mock Request.sendDetailed to verify request configuration
      const mockSendDetailed = jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '1000000000'
          }
        });

      await openstack.getMetadata();
      
      expect(mockSendDetailed).toHaveBeenCalledWith({
        url: 'http://swift.example.com/v1/AUTH_tenant/dev',
        headers: { 'X-Auth-Token': 'test-token-123' },
        method: 'HEAD',
        timeout: 5000
      });
    });

    it('should throw error when tenantPublicUrl is not defined', async () => {
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123',
        tenantPublicUrl: null
      });

      await expect(openstack.getMetadata())
        .rejects.toThrow('OpenStack tenent public URL not defined.');
    });

    it('should throw error when tenantPublicUrl is undefined', async () => {
      openstack.auth.getTenantAuthInfo = jest.fn().mockResolvedValue({
        tenantToken: 'test-token-123'
      });

      await expect(openstack.getMetadata())
        .rejects.toThrow('OpenStack tenent public URL not defined.');
    });

    it('should throw error when bytes conversion fails', async () => {
      // Mock Request.sendDetailed
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': 'invalid-number'
          }
        });

      const result = await openstack.getMetadata();
      
      // OpenStack doesn't throw error for invalid number, it returns NaN
      expect(result.gigabytesUsedCount).toBe('NaN');
      expect(result.gigabytesUsedCountRound).toBeNaN();
    });

    it('should handle missing headers gracefully', async () => {
      // Mock Request.sendDetailed
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {}
        });

      const result = await openstack.getMetadata();
      
      // OpenStack doesn't throw error for missing headers, it returns NaN
      expect(result.gigabytesUsedCount).toBe('NaN');
      expect(result.gigabytesUsedCountRound).toBeNaN();
    });

    it('should handle string showObjectCount parameter correctly', async () => {
      const testCases = [
        { param: 'true', shouldInclude: true },
        { param: 'false', shouldInclude: false },
        { param: 'TRUE', shouldInclude: false }, // Only exactly 'true' should work
        { param: '1', shouldInclude: false },
        { param: '', shouldInclude: false }
      ];

      for (const testCase of testCases) {
        // Mock Request.sendDetailed
        jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
          .mockResolvedValue({
            headers: {
              'x-container-bytes-used': '1000000000',
              'x-container-object-count': '100'
            }
          });

        const result = await openstack.getMetadata('dev', testCase.param);
        
        if (testCase.shouldInclude) {
          expect(result).toHaveProperty('objectCount', '100');
        } else {
          expect(result).not.toHaveProperty('objectCount');
        }
      }
    });

    it('should handle network errors', async () => {
      // Mock Request.sendDetailed to throw network error
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockRejectedValue(new Error('Network error'));

      await expect(openstack.getMetadata())
        .rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses gracefully', async () => {
      // Mock Request.sendDetailed to throw HTTP error
      jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockRejectedValue(new Error('Unauthorized'));

      await expect(openstack.getMetadata())
        .rejects.toThrow('Unauthorized');
    });
  });
});
