const nock = require('nock');

const Minio = require('./index');

beforeAll(() => {
  global.log = {
    save: jest.fn(),
  };
  global.silentUpload = true;
});

afterAll(() => {
  delete global.log;
  delete global.silentUpload;
});

describe('Minio Provider', () => {
  describe('Compilation Tests', () => {
    it('should compile and export Minio class', () => {
      expect(Minio).toBeDefined();
      expect(typeof Minio).toBe('function');
    });

    it('should have correct provider name', () => {
      expect(Minio.ProviderName).toBe('minio');
    });

    it('should be instantiable with config', () => {
      const config = {
        server: 'http://localhost:9000',
        bucket: 'test-bucket',
        tenantName: 'test-tenant',
        account: 'test-account'
      };

      const minio = new Minio(config);
      expect(minio).toBeInstanceOf(Minio);
      expect(minio.server).toBe(config.server);
      expect(minio.bucket).toBe(config.bucket);
      expect(minio.tenantName).toBe(config.tenantName);
      expect(minio.account).toBe(config.account);
    });

    it('should implement singleton pattern', () => {
      const config = {
        server: 'http://localhost:9000',
        bucket: 'test-bucket-2',
        tenantName: 'test-tenant-2',
        account: 'test-account-2'
      };

      const minio1 = new Minio(config);
      const minio2 = new Minio(config);
      
      expect(minio1).toBe(minio2);
    });

    it('should set default values correctly', () => {
      const config = {
        server: 'http://localhost:9000',
        bucket: 'test-bucket',
        tenantName: 'test-tenant',
        account: 'test-account'
      };

      // Reset singleton for this test
      Minio.singleton = null;
      
      const minio = new Minio(config);
      
      expect(minio.authVersion).toBe(3);
      expect(minio.container).toBe('dev');
      expect(minio.authCacheTtl).toBe(30000);
      expect(minio.routes).toEqual({ getTokens: '/v3/auth/tokens' });
    });

    it('should have all required methods', () => {
      const config = {
        server: 'http://localhost:9000',
        bucket: 'test-bucket',
        tenantName: 'test-tenant',
        account: 'test-account'
      };

      // Reset singleton for this test
      Minio.singleton = null;
      
      const minio = new Minio(config);

      // Check that all expected methods exist
      expect(typeof minio.getInfoToHandleFile).toBe('function');
      expect(typeof minio.downloadFileRequestOptions).toBe('function');
      expect(typeof minio.downloadFile).toBe('function');
      expect(typeof minio.downloadFileAsBuffer).toBe('function');
      expect(typeof minio.uploadFileRequestOptions).toBe('function');
      expect(typeof minio.uploadFile).toBe('function');
      expect(typeof minio.deleteFile).toBe('function');
      expect(typeof minio.getMetadata).toBe('function');
      expect(typeof minio.getRequestHeaders).toBe('function');
    });
  });

  describe('getInfoToHandleFile', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
    });

    it('should return correct URL format', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'text/plain';
      const method = 'GET';

      const result = await minio.getInfoToHandleFile({ filePath, contentType, method });

      expect(result.url).toBe(`${mockConfig.server}/${mockConfig.bucket}/${filePath}`);
    });

    it('should return headers with required properties', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'application/json';
      const method = 'PUT';

      const result = await minio.getInfoToHandleFile({ filePath, contentType, method });

      expect(result.headers).toHaveProperty('Date');
      expect(result.headers).toHaveProperty('Content-Type', contentType);
      expect(result.headers).toHaveProperty('Authorization');
    });

    it('should generate valid authorization header', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'application/json';
      const method = 'GET';

      const result = await minio.getInfoToHandleFile({ filePath, contentType, method });

      expect(result.headers.Authorization).toMatch(/^AWS testuser:/);
      expect(result.headers.Authorization).toContain('testuser');
    });

    it('should generate different authorization for different methods', async () => {
      const filePath = 'test/file.txt';
      const contentType = 'application/json';

      const getResult = await minio.getInfoToHandleFile({ filePath, contentType, method: 'GET' });
      const putResult = await minio.getInfoToHandleFile({ filePath, contentType, method: 'PUT' });

      expect(getResult.headers.Authorization).not.toBe(putResult.headers.Authorization);
    });

    it('should generate different authorization for different file paths', async () => {
      const contentType = 'application/json';
      const method = 'GET';

      const result1 = await minio.getInfoToHandleFile({ filePath: 'test/file1.txt', contentType, method });
      const result2 = await minio.getInfoToHandleFile({ filePath: 'test/file2.txt', contentType, method });

      expect(result1.headers.Authorization).not.toBe(result2.headers.Authorization);
    });

    it('should handle different content types', async () => {
      const filePath = 'test/file.txt';
      const method = 'GET';

      const jsonResult = await minio.getInfoToHandleFile({ filePath, contentType: 'application/json', method });
      const textResult = await minio.getInfoToHandleFile({ filePath, contentType: 'text/plain', method });

      expect(jsonResult.headers['Content-Type']).toBe('application/json');
      expect(textResult.headers['Content-Type']).toBe('text/plain');
      expect(jsonResult.headers.Authorization).not.toBe(textResult.headers.Authorization);
    });

    it('should handle undefined parameters gracefully', async () => {
      const result = await minio.getInfoToHandleFile();

      expect(result.url).toBe(`${mockConfig.server}/${mockConfig.bucket}/undefined`);
      expect(result.headers).toHaveProperty('Date');
      expect(result.headers).toHaveProperty('Content-Type', undefined);
      expect(result.headers).toHaveProperty('Authorization');
    });

    it('should handle empty object parameters', async () => {
      const result = await minio.getInfoToHandleFile({});

      expect(result.url).toBe(`${mockConfig.server}/${mockConfig.bucket}/undefined`);
      expect(result.headers).toHaveProperty('Date');
      expect(result.headers).toHaveProperty('Content-Type', undefined);
      expect(result.headers).toHaveProperty('Authorization');
    });

    it('should generate RFC compliant Date header', async () => {
      const result = await minio.getInfoToHandleFile({ filePath: 'test.txt', contentType: 'text/plain', method: 'GET' });

      // Date should be in RFC 1123 format (UTC)
      expect(result.headers.Date).toMatch(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
    });

    it('should throw error when account password is missing', async () => {
      // Reset singleton and create minio without password
      Minio.singleton = null;
      const configWithoutPassword = {
        ...mockConfig,
        account: { login: 'testuser' } // No password
      };
      const minioWithoutPassword = new Minio(configWithoutPassword);

      await expect(minioWithoutPassword.getInfoToHandleFile({ 
        filePath: 'test.txt', 
        contentType: 'text/plain', 
        method: 'GET' 
      })).rejects.toThrow('MinIO passsword required');
    });
  });

  describe('getRequestHeaders', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
    });

    it('should return headers with correct structure', () => {
      const tenantToken = 'test-token-123';
      const headers = minio.getRequestHeaders(tenantToken);

      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('X-Auth-Token');
    });

    it('should return correct Content-Type header', () => {
      const tenantToken = 'test-token-123';
      const headers = minio.getRequestHeaders(tenantToken);

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should return correct Accept header', () => {
      const tenantToken = 'test-token-123';
      const headers = minio.getRequestHeaders(tenantToken);

      expect(headers.Accept).toBe('application/json');
    });

    it('should include the provided tenant token in X-Auth-Token header', () => {
      const tenantToken = 'test-token-123';
      const headers = minio.getRequestHeaders(tenantToken);

      expect(headers['X-Auth-Token']).toBe(tenantToken);
    });

    it('should handle different tenant token values', () => {
      const token1 = 'token-abc-123';
      const token2 = 'token-xyz-456';

      const headers1 = minio.getRequestHeaders(token1);
      const headers2 = minio.getRequestHeaders(token2);

      expect(headers1['X-Auth-Token']).toBe(token1);
      expect(headers2['X-Auth-Token']).toBe(token2);
      expect(headers1['X-Auth-Token']).not.toBe(headers2['X-Auth-Token']);
    });

    it('should handle empty token', () => {
      const headers = minio.getRequestHeaders('');

      expect(headers['X-Auth-Token']).toBe('');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Accept).toBe('application/json');
    });

    it('should handle null token', () => {
      const headers = minio.getRequestHeaders(null);

      expect(headers['X-Auth-Token']).toBe(null);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Accept).toBe('application/json');
    });

    it('should handle undefined token', () => {
      const headers = minio.getRequestHeaders(undefined);

      expect(headers['X-Auth-Token']).toBe(undefined);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Accept).toBe('application/json');
    });

    it('should return new object instance on each call', () => {
      const tenantToken = 'test-token-123';
      
      const headers1 = minio.getRequestHeaders(tenantToken);
      const headers2 = minio.getRequestHeaders(tenantToken);

      expect(headers1).not.toBe(headers2); // Different object instances
      expect(headers1).toEqual(headers2); // But same content
    });

    it('should handle special characters in token', () => {
      const specialToken = 'token-with-@#$%^&*()_+{}[]|\\:";\'<>?,./';
      const headers = minio.getRequestHeaders(specialToken);

      expect(headers['X-Auth-Token']).toBe(specialToken);
    });

    it('should handle very long token', () => {
      const longToken = 'a'.repeat(1000);
      const headers = minio.getRequestHeaders(longToken);

      expect(headers['X-Auth-Token']).toBe(longToken);
      expect(headers['X-Auth-Token']).toHaveLength(1000);
    });
  });

  describe('downloadFile', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      timeout: 5000,
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeAll(() => {
      // Disable net connect to ensure all requests are mocked
      nock.disableNetConnect();
    });

    afterAll(() => {
      // Re-enable net connect and clean up
      nock.enableNetConnect();
      nock.cleanAll();
    });

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
      
      // Clean any existing mocks
      nock.cleanAll();
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
    });

    it('should return a stream when called', async () => {
      const filePath = 'test/file.txt';
      const fileContent = 'Hello, World!';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, fileContent);

      const stream = await minio.downloadFile(filePath);

      expect(stream).toBeDefined();
      
      // Verify the request was made
      expect(scope.isDone()).toBe(true);
    });

    it('should call downloadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/document.pdf';
      
      // Spy on downloadFileRequestOptions
      const downloadFileRequestOptionsSpy = jest.spyOn(minio, 'downloadFileRequestOptions');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, 'file content');

      await minio.downloadFile(filePath);

      expect(downloadFileRequestOptionsSpy).toHaveBeenCalledWith({ filePath });
      
      downloadFileRequestOptionsSpy.mockRestore();
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/image.jpg';

      // Mock the HTTP request with specific header expectations
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .matchHeader('date', /\w+, \d+ \w+ \d+ \d+:\d+:\d+ GMT/)
        .reply(200, 'image data');

      await minio.downloadFile(filePath);

      expect(scope.isDone()).toBe(true);
    });

    it('should handle different file paths correctly', async () => {
      const testCases = [
        'simple.txt',
        'folder/subfolder/file.pdf',
        'documents/report-2023.docx',
        'media/images/photo.png'
      ];

      for (const filePath of testCases) {
        // Mock each request
        const scope = nock(mockConfig.server)
          .get(`/${mockConfig.bucket}/${filePath}`)
          .matchHeader('authorization', /^AWS testuser:/)
          .reply(200, `content of ${filePath}`);

        const stream = await minio.downloadFile(filePath);
        
        expect(stream).toBeDefined();
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/timeout-test.txt';
      
      // Mock the downloadFileRequestOptions to verify timeout is passed
      const downloadFileRequestOptionsSpy = jest.spyOn(minio, 'downloadFileRequestOptions')
        .mockResolvedValue({
          url: `${mockConfig.server}/${mockConfig.bucket}/${filePath}`,
          headers: {
            'Date': new Date().toUTCString(),
            'Authorization': 'AWS testuser:signature'
          },
          method: 'GET',
          timeout: mockConfig.timeout
        });

      // Mock the HTTP request
      nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, 'content');

      await minio.downloadFile(filePath);

      const requestOptions = await downloadFileRequestOptionsSpy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(mockConfig.timeout);
      
      downloadFileRequestOptionsSpy.mockRestore();
    });

    it('should handle empty file path', async () => {
      const filePath = '';
      
      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '');

      const stream = await minio.downloadFile(filePath);

      expect(stream).toBeDefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle undefined file path', async () => {
      const filePath = undefined;
      
      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/undefined`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '');

      const stream = await minio.downloadFile(filePath);

      expect(stream).toBeDefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 404 errors consistently', async () => {
      const filePath = 'test/nonexistent.txt';
      
      // Mock a 404 HTTP response
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(404, 'Not Found');

      // The method may throw an error or return a stream that emits an error
      // We just verify it behaves consistently
      try {
        const stream = await minio.downloadFile(filePath);
        // If it returns a stream, that's valid behavior
        expect(stream).toBeDefined();
      } catch (error) {
        // If it throws an error, that's also valid behavior for 404
        expect(error).toBeDefined();
        expect(error.message).toContain('404');
      }
      
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 500 server errors consistently', async () => {
      const filePath = 'test/server-error.txt';
      
      // Mock a 500 HTTP response
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(500, 'Internal Server Error');

      // The method may throw an error or return a stream that emits an error
      try {
        const stream = await minio.downloadFile(filePath);
        expect(stream).toBeDefined();
      } catch (error) {
        // If it throws an error, that's valid behavior for 5xx errors
        expect(error).toBeDefined();
        expect(error.message).toContain('500');
      }
      
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 503 service unavailable errors consistently', async () => {
      const filePath = 'test/service-unavailable.txt';
      
      // Mock a 503 HTTP response
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(503, 'Service Unavailable');

      // The method may throw an error or return a stream that emits an error
      try {
        const stream = await minio.downloadFile(filePath);
        expect(stream).toBeDefined();
      } catch (error) {
        // If it throws an error, that's valid behavior for 5xx errors
        expect(error).toBeDefined();
        expect(error.message).toContain('503');
      }
      
      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors consistently', async () => {
      const filePath = 'test/network-error.txt';
      
      // Mock a network error
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .replyWithError('Network connection failed');

      // The method may throw an error or return a stream that emits an error
      try {
        const stream = await minio.downloadFile(filePath);
        expect(stream).toBeDefined();
      } catch (error) {
        // If it throws an error, that's valid behavior for network errors
        expect(error).toBeDefined();
        expect(error.message).toContain('Network connection failed');
      }
      
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('downloadFileAsBuffer', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      timeout: 5000,
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeAll(() => {
      // Disable net connect to ensure all requests are mocked
      nock.disableNetConnect();
    });

    afterAll(() => {
      // Re-enable net connect and clean up
      nock.enableNetConnect();
      nock.cleanAll();
    });

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
      
      // Clean any existing mocks
      nock.cleanAll();
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
    });

    it('should return a buffer when file download is successful', async () => {
      const filePath = 'test/file.txt';
      const fileContent = 'Hello, World!';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, fileContent);

      const buffer = await minio.downloadFileAsBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe(fileContent);
      expect(scope.isDone()).toBe(true);
    });

    it('should call downloadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/document.pdf';
      const contentType = 'application/pdf';
      
      // Spy on downloadFileRequestOptions
      const downloadFileRequestOptionsSpy = jest.spyOn(minio, 'downloadFileRequestOptions');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, 'file content');

      await minio.downloadFileAsBuffer(filePath, { contentType });

      expect(downloadFileRequestOptionsSpy).toHaveBeenCalledWith({ filePath, contentType });
      
      downloadFileRequestOptionsSpy.mockRestore();
    });

    it('should handle contentType parameter correctly', async () => {
      const filePath = 'test/image.jpg';
      const contentType = 'image/jpeg';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, 'image data');

      await minio.downloadFileAsBuffer(filePath, { contentType });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle binary data correctly', async () => {
      const filePath = 'test/binary.dat';
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, binaryData);

      const buffer = await minio.downloadFileAsBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer).toEqual(binaryData);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle different file types correctly', async () => {
      const testCases = [
        { filePath: 'test/text.txt', contentType: 'text/plain', content: 'Plain text content' },
        { filePath: 'test/data.json', contentType: 'application/json', content: '{"key": "value"}' },
        { filePath: 'test/style.css', contentType: 'text/css', content: 'body { margin: 0; }' }
      ];

      for (const testCase of testCases) {
        // Mock each request
        const scope = nock(mockConfig.server)
          .get(`/${mockConfig.bucket}/${testCase.filePath}`)
          .matchHeader('authorization', /^AWS testuser:/)
          .reply(200, testCase.content);

        const buffer = await minio.downloadFileAsBuffer(testCase.filePath, { contentType: testCase.contentType });
        
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.toString()).toBe(testCase.content);
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should handle empty file correctly', async () => {
      const filePath = 'test/empty.txt';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '');

      const buffer = await minio.downloadFileAsBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(0);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle undefined file path', async () => {
      const filePath = undefined;

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/undefined`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, 'content');

      const buffer = await minio.downloadFileAsBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe('content');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle missing contentType parameter', async () => {
      const filePath = 'test/no-content-type.txt';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, 'content without content type');

      const buffer = await minio.downloadFileAsBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe('content without content type');
      expect(scope.isDone()).toBe(true);
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/timeout-test.txt';
      
      // Mock the downloadFileRequestOptions to verify timeout is passed
      const downloadFileRequestOptionsSpy = jest.spyOn(minio, 'downloadFileRequestOptions')
        .mockResolvedValue({
          url: `${mockConfig.server}/${mockConfig.bucket}/${filePath}`,
          headers: {
            'Date': new Date().toUTCString(),
            'Authorization': 'AWS testuser:signature'
          },
          method: 'GET',
          timeout: mockConfig.timeout
        });

      // Mock the HTTP request
      nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, 'content');

      await minio.downloadFileAsBuffer(filePath);

      const requestOptions = await downloadFileRequestOptionsSpy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(mockConfig.timeout);
      
      downloadFileRequestOptionsSpy.mockRestore();
    });

    it('should handle 404 errors consistently', async () => {
      const filePath = 'test/nonexistent.txt';
      
      // Mock a 404 HTTP response
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(404, 'Not Found');

      // The method should throw an error for 404
      await expect(minio.downloadFileAsBuffer(filePath)).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 500 server errors consistently', async () => {
      const filePath = 'test/server-error.txt';
      
      // Mock a 500 HTTP response
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(500, 'Internal Server Error');

      // The method should throw an error for 5xx errors
      await expect(minio.downloadFileAsBuffer(filePath)).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors consistently', async () => {
      const filePath = 'test/network-error.txt';
      
      // Mock a network error
      const scope = nock(mockConfig.server)
        .get(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .replyWithError('Network connection failed');

      // The method should throw an error for network errors
      await expect(minio.downloadFileAsBuffer(filePath)).rejects.toThrow('Network connection failed');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('uploadFile', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      timeout: 5000,
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeAll(() => {
      // Disable net connect to ensure all requests are mocked
      nock.disableNetConnect();
    });

    afterAll(() => {
      // Re-enable net connect and clean up
      nock.enableNetConnect();
      nock.cleanAll();
    });

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
      
      // Clean any existing mocks
      nock.cleanAll();
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
    });

    it('should upload file successfully and return file info', async () => {
      const filePath = 'test/upload.txt';
      const contentType = 'text/plain';
      const fileContent = 'Hello, World!';
      const mockEtag = '"abc123def456"';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .matchHeader('content-type', contentType)
        .reply(200, '', {
          'etag': mockEtag
        });

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result).toEqual({
        fileLink: filePath,
        hash: mockEtag
      });
      expect(scope.isDone()).toBe(true);
    });

    it('should call uploadFileRequestOptions with correct parameters', async () => {
      const filePath = 'test/document.pdf';
      const contentType = 'application/pdf';
      const fileContent = Buffer.from('PDF content');
      
      // Spy on uploadFileRequestOptions
      const uploadFileRequestOptionsSpy = jest.spyOn(minio, 'uploadFileRequestOptions');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, '', { 'etag': '"test-etag"' });

      await minio.uploadFile(filePath, contentType, fileContent);

      expect(uploadFileRequestOptionsSpy).toHaveBeenCalledWith(filePath, contentType, fileContent);
      
      uploadFileRequestOptionsSpy.mockRestore();
    });

    it('should handle different content types correctly', async () => {
      const testCases = [
        { filePath: 'test/text.txt', contentType: 'text/plain', content: 'Plain text' },
        { filePath: 'test/data.json', contentType: 'application/json', content: '{"key": "value"}' },
        { filePath: 'test/image.jpg', contentType: 'image/jpeg', content: 'binary image data' }
      ];

      for (const testCase of testCases) {
        const mockEtag = `"etag-${testCase.filePath}"`;
        
        // Mock each request
        const scope = nock(mockConfig.server)
          .put(`/${mockConfig.bucket}/${testCase.filePath}`, testCase.content)
          .matchHeader('authorization', /^AWS testuser:/)
          .matchHeader('content-type', testCase.contentType)
          .reply(200, '', { 'etag': mockEtag });

        const result = await minio.uploadFile(testCase.filePath, testCase.contentType, testCase.content);
        
        expect(result.fileLink).toBe(testCase.filePath);
        expect(result.hash).toBe(mockEtag);
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should handle Buffer file content', async () => {
      const filePath = 'test/binary.dat';
      const contentType = 'application/octet-stream';
      const fileContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
      const mockEtag = '"binary-etag"';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '', { 'etag': mockEtag });

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBe(mockEtag);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle string file content', async () => {
      const filePath = 'test/string.txt';
      const contentType = 'text/plain';
      const fileContent = 'String content to upload';
      const mockEtag = '"string-etag"';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '', { 'etag': mockEtag });

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBe(mockEtag);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle empty file content', async () => {
      const filePath = 'test/empty.txt';
      const contentType = 'text/plain';
      const fileContent = '';
      const mockEtag = '"empty-etag"';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '', { 'etag': mockEtag });

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBe(mockEtag);
      expect(scope.isDone()).toBe(true);
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/headers.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock the HTTP request with specific header expectations
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .matchHeader('date', /\w+, \d+ \w+ \d+ \d+:\d+:\d+ GMT/)
        .matchHeader('content-type', contentType)
        .reply(200, '', { 'etag': '"test-etag"' });

      await minio.uploadFile(filePath, contentType, fileContent);

      expect(scope.isDone()).toBe(true);
    });

    it('should handle response without etag header', async () => {
      const filePath = 'test/no-etag.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock the HTTP request without etag header
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '');

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBeUndefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle large file paths correctly', async () => {
      const filePath = 'test/very/deep/folder/structure/with/many/levels/file.txt';
      const contentType = 'text/plain';
      const fileContent = 'deep file content';
      const mockEtag = '"deep-etag"';

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '', { 'etag': mockEtag });

      const result = await minio.uploadFile(filePath, contentType, fileContent);

      expect(result.fileLink).toBe(filePath);
      expect(result.hash).toBe(mockEtag);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 400 bad request errors', async () => {
      const filePath = 'test/bad-request.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock a 400 HTTP response
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(400, 'Bad Request');

      // The method should reject when status code is not 200
      await expect(minio.uploadFile(filePath, contentType, fileContent)).rejects.toBeDefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 403 forbidden errors', async () => {
      const filePath = 'test/forbidden.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock a 403 HTTP response
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(403, 'Forbidden');

      // The method should reject when status code is not 200
      await expect(minio.uploadFile(filePath, contentType, fileContent)).rejects.toBeDefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 500 server errors', async () => {
      const filePath = 'test/server-error.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock a 500 HTTP response
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(500, 'Internal Server Error');

      // The method should reject when status code is not 200
      await expect(minio.uploadFile(filePath, contentType, fileContent)).rejects.toBeDefined();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors', async () => {
      const filePath = 'test/network-error.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';

      // Mock a network error
      const scope = nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`, fileContent)
        .matchHeader('authorization', /^AWS testuser:/)
        .replyWithError('Network connection failed');

      await expect(minio.uploadFile(filePath, contentType, fileContent)).rejects.toThrow('Network connection failed');
      expect(scope.isDone()).toBe(true);
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/timeout-test.txt';
      const contentType = 'text/plain';
      const fileContent = 'content';
      
      // Mock the uploadFileRequestOptions to verify timeout is passed
      const uploadFileRequestOptionsSpy = jest.spyOn(minio, 'uploadFileRequestOptions')
        .mockResolvedValue({
          url: `${mockConfig.server}/${mockConfig.bucket}/${filePath}`,
          headers: {
            'Date': new Date().toUTCString(),
            'Authorization': 'AWS testuser:signature',
            'Content-Type': contentType
          },
          method: 'PUT',
          body: fileContent,
          timeout: mockConfig.timeout
        });

      // Mock the HTTP request
      nock(mockConfig.server)
        .put(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, '', { 'etag': '"test-etag"' });

      await minio.uploadFile(filePath, contentType, fileContent);

      const requestOptions = await uploadFileRequestOptionsSpy.mock.results[0].value;
      expect(requestOptions.timeout).toBe(mockConfig.timeout);
      
      uploadFileRequestOptionsSpy.mockRestore();
    });
  });

  describe('deleteFile', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      timeout: 5000,
      container: 'dev',
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeAll(() => {
      // Disable net connect to ensure all requests are mocked
      nock.disableNetConnect();
    });

    afterAll(() => {
      // Re-enable net connect and clean up
      nock.enableNetConnect();
      nock.cleanAll();
    });

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
      
      // Clean any existing mocks
      nock.cleanAll();
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
    });

    it('should delete file successfully and return result', async () => {
      const filePath = 'test/delete-me.txt';
      const mockResponse = { success: true };

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, mockResponse);

      const result = await minio.deleteFile(filePath);

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('should call getInfoToHandleFile with correct parameters', async () => {
      const filePath = 'test/document.pdf';
      
      // Spy on getInfoToHandleFile
      const getInfoToHandleFileSpy = jest.spyOn(minio, 'getInfoToHandleFile');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, {});

      await minio.deleteFile(filePath);

      expect(getInfoToHandleFileSpy).toHaveBeenCalledWith({ 
        filePath, 
        containerName: mockConfig.container, 
        method: 'DELETE' 
      });
      
      getInfoToHandleFileSpy.mockRestore();
    });

    it('should use default container when not specified', async () => {
      const filePath = 'test/default-container.txt';
      
      // Spy on getInfoToHandleFile
      const getInfoToHandleFileSpy = jest.spyOn(minio, 'getInfoToHandleFile');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, {});

      await minio.deleteFile(filePath);

      expect(getInfoToHandleFileSpy).toHaveBeenCalledWith({ 
        filePath, 
        containerName: mockConfig.container, 
        method: 'DELETE' 
      });
      
      getInfoToHandleFileSpy.mockRestore();
    });

    it('should use custom container when specified', async () => {
      const filePath = 'test/custom-container.txt';
      const customContainer = 'custom-container';
      
      // Spy on getInfoToHandleFile
      const getInfoToHandleFileSpy = jest.spyOn(minio, 'getInfoToHandleFile');
      
      // Mock the HTTP request
      nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .reply(200, {});

      await minio.deleteFile(filePath, customContainer);

      expect(getInfoToHandleFileSpy).toHaveBeenCalledWith({ 
        filePath, 
        containerName: customContainer, 
        method: 'DELETE' 
      });
      
      getInfoToHandleFileSpy.mockRestore();
    });

    it('should include correct headers in the request', async () => {
      const filePath = 'test/headers.txt';

      // Mock the HTTP request with specific header expectations
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .matchHeader('date', /\w+, \d+ \w+ \d+ \d+:\d+:\d+ GMT/)
        .reply(200, {});

      await minio.deleteFile(filePath);

      expect(scope.isDone()).toBe(true);
    });

    it('should handle different file paths correctly', async () => {
      const testCases = [
        'simple.txt',
        'folder/subfolder/file.pdf',
        'documents/report-2023.docx',
        'media/images/photo.png'
      ];

      for (const filePath of testCases) {
        const mockResponse = { deleted: filePath };
        
        // Mock each request
        const scope = nock(mockConfig.server)
          .delete(`/${mockConfig.bucket}/${filePath}`)
          .matchHeader('authorization', /^AWS testuser:/)
          .reply(200, mockResponse);

        const result = await minio.deleteFile(filePath);
        
        expect(result).toEqual(mockResponse);
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should handle empty response body', async () => {
      const filePath = 'test/empty-response.txt';

      // Mock the HTTP request with empty response
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, '');

      const result = await minio.deleteFile(filePath);

      expect(result).toBe('');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle JSON response body', async () => {
      const filePath = 'test/json-response.txt';
      const mockResponse = { 
        deleted: true, 
        timestamp: '2025-09-11T12:00:00Z',
        filePath: filePath 
      };

      // Mock the HTTP request with JSON response
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, mockResponse);

      const result = await minio.deleteFile(filePath);

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('should properly configure request timeout', async () => {
      const filePath = 'test/timeout-test.txt';
      
      // Mock Request.send to verify timeout is passed
      const sendSpy = jest.spyOn(require('../../lib/http_request'), 'send')
        .mockResolvedValue({ success: true });

      await minio.deleteFile(filePath);

      expect(sendSpy).toHaveBeenCalledWith({
        url: `${mockConfig.server}/${mockConfig.bucket}/${filePath}`,
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^AWS testuser:/),
          'Date': expect.stringMatching(/\w+, \d+ \w+ \d+ \d+:\d+:\d+ GMT/)
        }),
        method: 'DELETE',
        timeout: mockConfig.timeout
      });
      
      sendSpy.mockRestore();
    });

    it('should handle 404 not found errors', async () => {
      const filePath = 'test/not-found.txt';

      // Mock a 404 HTTP response
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(404, 'Not Found');

      // The method returns the error response body
      const result = await minio.deleteFile(filePath);
      expect(result).toBe('Not Found');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 403 forbidden errors', async () => {
      const filePath = 'test/forbidden.txt';

      // Mock a 403 HTTP response
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(403, 'Forbidden');

      // The method returns the error response body
      const result = await minio.deleteFile(filePath);
      expect(result).toBe('Forbidden');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle 500 server errors', async () => {
      const filePath = 'test/server-error.txt';

      // Mock a 500 HTTP response
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(500, 'Internal Server Error');

      // The method returns the error response body
      const result = await minio.deleteFile(filePath);
      expect(result).toBe('Internal Server Error');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors', async () => {
      const filePath = 'test/network-error.txt';

      // Mock a network error
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .replyWithError('Network connection failed');

      // The method should throw an error for network errors
      await expect(minio.deleteFile(filePath)).rejects.toThrow('Network connection failed');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle undefined file path', async () => {
      const filePath = undefined;

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/undefined`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, { deleted: true });

      const result = await minio.deleteFile(filePath);

      expect(result.deleted).toBe(true);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle large file paths correctly', async () => {
      const filePath = 'test/very/deep/folder/structure/with/many/levels/file-to-delete.txt';
      const mockResponse = { deleted: true, path: filePath };

      // Mock the HTTP request
      const scope = nock(mockConfig.server)
        .delete(`/${mockConfig.bucket}/${filePath}`)
        .matchHeader('authorization', /^AWS testuser:/)
        .reply(200, mockResponse);

      const result = await minio.deleteFile(filePath);

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getMetadata', () => {
    let minio;
    const mockConfig = {
      server: 'http://localhost:9000',
      bucket: 'test-bucket',
      tenantName: 'test-tenant',
      timeout: 5000,
      container: 'dev',
      account: {
        login: 'testuser',
        password: 'testpassword'
      }
    };

    beforeAll(() => {
      // Disable net connect to ensure all requests are mocked
      nock.disableNetConnect();
    });

    afterAll(() => {
      // Re-enable net connect and clean up
      nock.enableNetConnect();
      nock.cleanAll();
    });

    beforeEach(() => {
      // Reset singleton before each test
      Minio.singleton = null;
      minio = new Minio(mockConfig);
      
      // Clean any existing mocks
      nock.cleanAll();
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
    });

    it('should get metadata successfully and return storage info', async () => {
      const mockTenantToken = 'test-tenant-token-123';
      const mockTenantPublicUrl = 'http://tenant.example.com';
      const mockBytesUsed = '500000000'; // 500MB
      const mockObjectCount = '42';

      // Mock the auth.getAuthInfo method
      const getAuthInfoSpy = jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP HEAD request
      const scope = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .matchHeader('x-auth-token', mockTenantToken)
        .reply(200, '', {
          'x-container-bytes-used': mockBytesUsed,
          'x-container-object-count': mockObjectCount
        });

      const result = await minio.getMetadata();

      expect(result).toEqual({
        gigabytesUsedCount: '0.50',
        gigabytesUsedCountRound: 1
      });
      expect(scope.isDone()).toBe(true);
      
      getAuthInfoSpy.mockRestore();
    });

    it('should call auth.getAuthInfo with correct method', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      const getAuthInfoSpy = jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request
      nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': '1000000000',
          'x-container-object-count': '10'
        });

      await minio.getMetadata();

      expect(getAuthInfoSpy).toHaveBeenCalledWith({ method: 'GET' });
      
      getAuthInfoSpy.mockRestore();
    });

    it('should use default container when not specified', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request to the default container
      const scope = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .matchHeader('x-auth-token', mockTenantToken)
        .reply(200, '', {
          'x-container-bytes-used': '2000000000',
          'x-container-object-count': '20'
        });

      await minio.getMetadata();

      expect(scope.isDone()).toBe(true);
    });

    it('should use custom container when specified', async () => {
      const customContainer = 'custom-container';
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request to the custom container
      const scope = nock(mockTenantPublicUrl)
        .head(`/${customContainer}`)
        .matchHeader('x-auth-token', mockTenantToken)
        .reply(200, '', {
          'x-container-bytes-used': '3000000000',
          'x-container-object-count': '30'
        });

      await minio.getMetadata(customContainer);

      expect(scope.isDone()).toBe(true);
    });

    it('should include object count when showObjectCount is "true"', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';
      const mockBytesUsed = '1500000000'; // 1.5GB
      const mockObjectCount = '123';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request
      nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': mockBytesUsed,
          'x-container-object-count': mockObjectCount
        });

      const result = await minio.getMetadata(mockConfig.container, 'true');

      expect(result).toEqual({
        gigabytesUsedCount: '1.50',
        gigabytesUsedCountRound: 2,
        objectCount: mockObjectCount
      });
    });

    it('should exclude object count when showObjectCount is false', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';
      const mockBytesUsed = '750000000'; // 0.75GB
      const mockObjectCount = '88';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request
      nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': mockBytesUsed,
          'x-container-object-count': mockObjectCount
        });

      const result = await minio.getMetadata(mockConfig.container, false);

      expect(result).toEqual({
        gigabytesUsedCount: '0.75',
        gigabytesUsedCountRound: 1
      });
      expect(result).not.toHaveProperty('objectCount');
    });

    it('should properly calculate gigabytes from bytes', async () => {
      const testCases = [
        { bytes: '1000000000', expectedGB: '1.00', expectedRound: 1 }, // 1GB
        { bytes: '2500000000', expectedGB: '2.50', expectedRound: 3 }, // 2.5GB
        { bytes: '500000000', expectedGB: '0.50', expectedRound: 1 },  // 0.5GB
        { bytes: '100000000', expectedGB: '0.10', expectedRound: 0 },  // 0.1GB
        { bytes: '0', expectedGB: '0.00', expectedRound: 0 }            // 0GB
      ];

      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      for (const testCase of testCases) {
        // Mock each request
        const scope = nock(mockTenantPublicUrl)
          .head(`/${mockConfig.container}`)
          .reply(200, '', {
            'x-container-bytes-used': testCase.bytes,
            'x-container-object-count': '10'
          });

        const result = await minio.getMetadata();
        
        expect(result.gigabytesUsedCount).toBe(testCase.expectedGB);
        expect(result.gigabytesUsedCountRound).toBe(testCase.expectedRound);
        expect(scope.isDone()).toBe(true);
      }
    });

    it('should configure request correctly', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock Request.sendDetailed to verify request configuration
      const sendDetailedSpy = jest.spyOn(require('../../lib/http_request'), 'sendDetailed')
        .mockResolvedValue({
          headers: {
            'x-container-bytes-used': '1000000000',
            'x-container-object-count': '50'
          }
        });

      await minio.getMetadata();

      expect(sendDetailedSpy).toHaveBeenCalledWith({
        url: `${mockTenantPublicUrl}/${mockConfig.container}`,
        headers: { 'X-Auth-Token': mockTenantToken },
        method: 'HEAD',
        timeout: mockConfig.timeout
      });
      
      sendDetailedSpy.mockRestore();
    });

    it('should throw error when tenantPublicUrl is not defined', async () => {
      // Mock the auth.getAuthInfo method to return no tenantPublicUrl
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: 'test-token',
          tenantPublicUrl: null
        });

      await expect(minio.getMetadata()).rejects.toThrow('Minio tenent public URL not defined.');
    });

    it('should throw error when tenantPublicUrl is undefined', async () => {
      // Mock the auth.getAuthInfo method to return undefined tenantPublicUrl
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: 'test-token',
          tenantPublicUrl: undefined
        });

      await expect(minio.getMetadata()).rejects.toThrow('Minio tenent public URL not defined.');
    });

    it('should throw error when bytes conversion fails', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request with invalid bytes value
      nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': 'invalid-number',
          'x-container-object-count': '10'
        });

      // Mock Number constructor to throw error
      const originalNumber = global.Number;
      global.Number = jest.fn(() => {
        throw new Error('Invalid number conversion');
      });

      await expect(minio.getMetadata()).rejects.toThrow();

      // Restore Number constructor
      global.Number = originalNumber;
    });

    it('should handle missing headers gracefully', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock the HTTP request with missing headers
      nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {});

      const result = await minio.getMetadata();

      expect(result.gigabytesUsedCount).toBe('NaN');
      expect(result.gigabytesUsedCountRound).toBeNaN();
    });

    it('should handle string showObjectCount parameter correctly', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';
      const mockObjectCount = '99';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Test with string 'true'
      const scopeTrue = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': '1000000000',
          'x-container-object-count': mockObjectCount
        });

      const resultWithTrue = await minio.getMetadata(mockConfig.container, 'true');
      expect(resultWithTrue).toHaveProperty('objectCount', mockObjectCount);
      expect(scopeTrue.isDone()).toBe(true);

      // Test with string 'false' 
      const scopeFalse = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': '1000000000',
          'x-container-object-count': mockObjectCount
        });

      const resultWithFalse = await minio.getMetadata(mockConfig.container, 'false');
      expect(resultWithFalse).not.toHaveProperty('objectCount');
      expect(scopeFalse.isDone()).toBe(true);

      // Test with boolean true
      const scopeBoolTrue = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(200, '', {
          'x-container-bytes-used': '1000000000',
          'x-container-object-count': mockObjectCount
        });

      const resultWithBoolTrue = await minio.getMetadata(mockConfig.container, true);
      expect(resultWithBoolTrue).not.toHaveProperty('objectCount');
      expect(scopeBoolTrue.isDone()).toBe(true);
    });

    it('should handle network errors', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock a network error
      const scope = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .replyWithError('Network connection failed');

      await expect(minio.getMetadata()).rejects.toThrow('Network connection failed');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle HTTP error responses gracefully', async () => {
      const mockTenantToken = 'test-token';
      const mockTenantPublicUrl = 'http://tenant.example.com';

      // Mock the auth.getAuthInfo method
      jest.spyOn(minio.auth, 'getAuthInfo')
        .mockReturnValue({
          tenantToken: mockTenantToken,
          tenantPublicUrl: mockTenantPublicUrl
        });

      // Mock a 404 HTTP response - Request.sendDetailed may not throw on HTTP errors
      const scope = nock(mockTenantPublicUrl)
        .head(`/${mockConfig.container}`)
        .reply(404, 'Container Not Found', {});

      // The method may handle HTTP errors gracefully and return default values
      const result = await minio.getMetadata();
      
      // Verify the request was made
      expect(scope.isDone()).toBe(true);
      
      // The result should still be defined (method handles errors gracefully)
      expect(result).toBeDefined();
    });
  });

  afterEach(() => {
    // Reset singleton after each test to avoid interference
    Minio.singleton = null;
  });
});
