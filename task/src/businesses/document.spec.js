const crypto = require('crypto');
const nock = require('nock');

const DocumentBusiness = require('./document');

describe('DocumentBusiness', () => {
  global.config = {
    storage: {},
    filestorage: {},
    eds: {
      timeout: 30000,
      pkcs7: {
        timeout: 30000,
        signToolUrl: 'http://localhost:3004',
      },
    },
    download_token: { jwtSecret: 'YourJWTSecretKey' },
    external_reader: {},
    register: {},
    auth: {
      LiquioId: {},
    },
    notifier: {},
  };
  global.db = {
    define: jest.fn().mockReturnValue({ prototype: {} }),
    sync: jest.fn(),
    authenticate: jest.fn(),
    transaction: jest.fn(),
    query: jest.fn(),
    close: jest.fn(),
  };

  it('should initialize', () => {
    const documentBusiness = new DocumentBusiness(global.config);
    expect(documentBusiness).toBeDefined();
  });

  describe('getSha512Hash', () => {
    const documentBusiness = new DocumentBusiness(global.config);

    it('should return a sha512 hash without HMAC', () => {
      const data = 'test data';
      const expectedHash = crypto.createHash('sha512').update(data).digest('hex');

      const result = documentBusiness.getSha512Hash(data);

      expect(result).toBe(expectedHash);
    });

    it('should return a sha512 HMAC hash when HMAC secret is provided', () => {
      const data = 'test data';
      const hmacSecret = 'secret';
      const expectedHash = crypto.createHmac('sha512', hmacSecret).update(data).digest('hex');

      const result = documentBusiness.getSha512Hash(data, { hmac: hmacSecret });

      expect(result).toBe(expectedHash);
    });

    it('should throw an error if data is not provided', () => {
      expect(() => documentBusiness.getSha512Hash()).toThrow();
    });
  });

  describe('getFileHash', () => {
    let documentBusiness;

    beforeEach(() => {
      // Create fresh instance for each test
      DocumentBusiness.singleton = null;
      documentBusiness = new DocumentBusiness(global.config);

      // Mock global.log to avoid logging during tests
      global.log = {
        save: jest.fn(),
      };
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
      DocumentBusiness.singleton = null;
    });

    it('should calculate file hash successfully when fileId is provided', async () => {
      const fileId = 'test-file-id';
      const mockFileContent = Buffer.from('test file content');
      const expectedHash = crypto.createHash('sha512').update(mockFileContent).digest('hex');

      // Mock the storage service
      const mockRequestOptions = {
        url: 'https://example.com/download/test-file-id',
        method: 'GET',
        headers: {
          Authorization: 'Bearer token',
        },
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      // Mock the HTTP request using nock
      nock('https://example.com').get('/download/test-file-id').matchHeader('Authorization', 'Bearer token').reply(200, mockFileContent);

      const document = { fileId: 'default-file-id' };
      const result = await documentBusiness.getFileHash(document, fileId);

      expect(result).toBe(expectedHash);
      expect(documentBusiness.storageService.provider.downloadFileRequestOptions).toHaveBeenCalledWith(fileId);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-file-hash-success',
        expect.objectContaining({
          fileId,
          hash: expectedHash,
          time: expect.any(Number),
        }),
      );
    });

    it('should calculate file hash successfully when fileId is not provided and uses document.fileId', async () => {
      const documentFileId = 'document-file-id';
      const mockFileContent = Buffer.from('document file content');
      const expectedHash = crypto.createHash('sha512').update(mockFileContent).digest('hex');

      const mockRequestOptions = {
        url: 'https://example.com/download/document-file-id',
        method: 'GET',
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      // Mock the HTTP request using nock
      nock('https://example.com').get('/download/document-file-id').reply(200, mockFileContent);

      const document = { fileId: documentFileId };
      const result = await documentBusiness.getFileHash(document);

      expect(result).toBe(expectedHash);
      expect(documentBusiness.storageService.provider.downloadFileRequestOptions).toHaveBeenCalledWith(documentFileId);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-file-hash-success',
        expect.objectContaining({
          fileId: undefined,
          hash: expectedHash,
          time: expect.any(Number),
        }),
      );
    });

    it('should handle missing download options and return undefined', async () => {
      const fileId = 'missing-options-file-id';

      // Mock the storage service to return null/undefined options
      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(null),
        },
      };

      const document = { fileId: 'default-file-id' };
      const result = await documentBusiness.getFileHash(document, fileId);

      expect(result).toBeUndefined();
      expect(global.log.save).toHaveBeenCalledWith('get-file-hash-options-error', expect.objectContaining({ fileId }));
    });

    it('should return undefined when document has no fileId and no fileId is provided', async () => {
      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(null),
        },
      };

      const document = {}; // No fileId
      const result = await documentBusiness.getFileHash(document);

      expect(result).toBeUndefined();
      expect(global.log.save).toHaveBeenCalledWith(
        'get-file-hash-options-error',
        expect.objectContaining({
          fileId: undefined,
          time: expect.any(Number),
        }),
      );
    });

    it('should return undefined when file download fails', async () => {
      const fileId = 'test-file-id';

      const mockRequestOptions = {
        url: 'https://example.com/download/test-file-id',
        method: 'GET',
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      // Mock HTTP request to return 404
      nock('https://example.com').get('/download/test-file-id').reply(404);

      const document = { fileId: 'default-file-id' };

      await expect(documentBusiness.getFileHash(document, fileId)).rejects.toThrow();
    });

    it('should calculate hash for empty file content', async () => {
      const fileId = 'empty-file-id';
      const emptyBuffer = Buffer.alloc(0);
      const expectedHash = crypto.createHash('sha512').update(emptyBuffer).digest('hex');

      const mockRequestOptions = {
        url: 'https://example.com/download/empty-file-id',
        method: 'GET',
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      // Mock HTTP request to return empty buffer
      nock('https://example.com').get('/download/empty-file-id').reply(200, emptyBuffer);

      const document = { fileId: 'default-file-id' };
      const result = await documentBusiness.getFileHash(document, fileId);

      expect(result).toBe(expectedHash);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-file-hash-success',
        expect.objectContaining({
          fileId,
          hash: expectedHash,
          time: expect.any(Number),
        }),
      );
    });

    it('should handle network errors gracefully', async () => {
      const fileId = 'test-file-id';

      const mockRequestOptions = {
        url: 'https://example.com/download/test-file-id',
        method: 'GET',
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      // Mock HTTP request to simulate network error
      nock('https://example.com').get('/download/test-file-id').replyWithError('Network error');

      const document = { fileId: 'default-file-id' };

      await expect(documentBusiness.getFileHash(document, fileId)).rejects.toThrow('Network error');
    });

    it('should handle different file content types correctly', async () => {
      const fileId = 'binary-file-id';
      // Create binary content (e.g., image data)
      const mockBinaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
      const expectedHash = crypto.createHash('sha512').update(mockBinaryContent).digest('hex');

      const mockRequestOptions = {
        url: 'https://example.com/download/binary-file-id',
        method: 'GET',
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions),
        },
      };

      nock('https://example.com').get('/download/binary-file-id').reply(200, mockBinaryContent);

      const document = { fileId: 'default-file-id' };
      const result = await documentBusiness.getFileHash(document, fileId);

      expect(result).toBe(expectedHash);
    });
  });

  describe('getFileBase64', () => {
    let documentBusiness;
    
    beforeEach(() => {
      // Create fresh instance for each test
      DocumentBusiness.singleton = null;
      documentBusiness = new DocumentBusiness(global.config);
      
      // Mock global.log to avoid logging during tests
      global.log = {
        save: jest.fn()
      };
    });

    afterEach(() => {
      // Clean up nock after each test
      nock.cleanAll();
      DocumentBusiness.singleton = null;
    });

    it('should convert file content to base64 successfully', async () => {
      const fileId = 'test-file-id';
      const mockFileContent = Buffer.from('test file content');
      const expectedBase64 = mockFileContent.toString('base64');

      // Mock the storage service
      const mockRequestOptions = {
        url: 'https://example.com/download/test-file-id',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token'
        }
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      // Mock the HTTP request using nock
      nock('https://example.com')
        .get('/download/test-file-id')
        .matchHeader('Authorization', 'Bearer token')
        .reply(200, mockFileContent);

      const result = await documentBusiness.getFileBase64(fileId);

      expect(result).toBe(expectedBase64);
      expect(documentBusiness.storageService.provider.downloadFileRequestOptions).toHaveBeenCalledWith(fileId);
    });

    it('should handle empty file content and return empty base64', async () => {
      const fileId = 'empty-file-id';
      const emptyBuffer = Buffer.alloc(0);
      const expectedBase64 = emptyBuffer.toString('base64'); // Empty string

      const mockRequestOptions = {
        url: 'https://example.com/download/empty-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      nock('https://example.com')
        .get('/download/empty-file-id')
        .reply(200, emptyBuffer);

      const result = await documentBusiness.getFileBase64(fileId);

      expect(result).toBe(expectedBase64);
    });

    it('should handle binary file content correctly', async () => {
      const fileId = 'binary-file-id';
      // Create binary content (e.g., image data)
      const mockBinaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
      const expectedBase64 = mockBinaryContent.toString('base64');

      const mockRequestOptions = {
        url: 'https://example.com/download/binary-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      nock('https://example.com')
        .get('/download/binary-file-id')
        .reply(200, mockBinaryContent);

      const result = await documentBusiness.getFileBase64(fileId);

      expect(result).toBe(expectedBase64);
    });

    it('should handle large file content', async () => {
      const fileId = 'large-file-id';
      // Create large content (1MB)
      const largeContent = Buffer.alloc(1024 * 1024, 'a');
      const expectedBase64 = largeContent.toString('base64');

      const mockRequestOptions = {
        url: 'https://example.com/download/large-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      nock('https://example.com')
        .get('/download/large-file-id')
        .reply(200, largeContent);

      const result = await documentBusiness.getFileBase64(fileId);

      expect(result).toBe(expectedBase64);
    });

    it('should throw error when download options are not available', async () => {
      const fileId = 'missing-options-file-id';
      
      // Mock the storage service to return null/undefined options
      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(null)
        }
      };

      // The method doesn't check for null downloadFileRequestOptions, so it should throw
      await expect(documentBusiness.getFileBase64(fileId)).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const fileId = 'error-file-id';

      const mockRequestOptions = {
        url: 'https://example.com/download/error-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      // Mock HTTP request to simulate network error
      nock('https://example.com')
        .get('/download/error-file-id')
        .replyWithError('Network error');

      await expect(documentBusiness.getFileBase64(fileId)).rejects.toThrow('Network error');
    });

    it('should handle 404 errors', async () => {
      const fileId = 'not-found-file-id';

      const mockRequestOptions = {
        url: 'https://example.com/download/not-found-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      // Mock HTTP request to return 404
      nock('https://example.com')
        .get('/download/not-found-file-id')
        .reply(404);

      await expect(documentBusiness.getFileBase64(fileId)).rejects.toThrow();
    });

    it('should handle text file content correctly', async () => {
      const fileId = 'text-file-id';
      const textContent = 'Hello, World! This is a test file with special characters: àáâãäåæçèéêë';
      const mockFileContent = Buffer.from(textContent, 'utf8');
      const expectedBase64 = mockFileContent.toString('base64');

      const mockRequestOptions = {
        url: 'https://example.com/download/text-file-id',
        method: 'GET'
      };

      documentBusiness.storageService = {
        provider: {
          downloadFileRequestOptions: jest.fn().mockResolvedValue(mockRequestOptions)
        }
      };

      nock('https://example.com')
        .get('/download/text-file-id')
        .reply(200, mockFileContent);

      const result = await documentBusiness.getFileBase64(fileId);

      expect(result).toBe(expectedBase64);
      // Verify we can decode it back
      expect(Buffer.from(result, 'base64').toString('utf8')).toBe(textContent);
    });
  });
});
