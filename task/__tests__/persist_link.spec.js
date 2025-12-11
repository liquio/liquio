const PersistLink = require('../src/lib/persist_link');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock the log module
const mockLog = {
  save: jest.fn()
};
global.log = mockLog;

// Mock global config
const mockConfig = {
  persist_link: {
    server: 'https://test-server.com',
    port: 443,
    routes: {
      generateQr: '/custom/qr',
      ping: '/custom/ping',
      pingWithAuth: '/custom/ping_auth'
    },
    token: 'test-token-123',
    urlToDocument: 'https://frontend.com/document',
    urlToCaseAndProceeding: 'https://frontend.com/case',
    serverName: 'test-server',
    getLinkToFilestorageTimeout: 25000
  }
};
global.config = mockConfig;

describe('PersistLink', () => {
  let persistLink;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    PersistLink.singleton = null;
    
    persistLink = new PersistLink();
  });

  describe('Constructor and Singleton Pattern', () => {
    it('should create a singleton instance', () => {
      const instance1 = new PersistLink();
      const instance2 = new PersistLink();
      
      expect(instance1).toBe(instance2);
      expect(PersistLink.singleton).toBe(instance1);
    });

    it('should use default config when no config provided', () => {
      PersistLink.singleton = null;
      
      const instance = new PersistLink({});
      
      expect(instance.config.server).toBe('https://persist-link-test-court-services.liquio.local');
      expect(instance.config.port).toBe(443);
      expect(instance.config.token).toBe('<removed>');
    });

    it('should merge provided config with defaults', () => {
      PersistLink.singleton = null;
      
      const customConfig = {
        server: 'https://custom-server.com',
        token: 'custom-token',
        routes: {
          generateQr: '/custom/generate'
        }
      };
      
      const instance = new PersistLink(customConfig);
      
      expect(instance.config.server).toBe('https://custom-server.com');
      expect(instance.config.token).toBe('custom-token');
      expect(instance.config.routes.generateQr).toBe('/custom/generate');
      expect(instance.config.routes.ping).toBe('/test/ping'); // Should keep default
    });

    it('should set up URL properties correctly', () => {
      expect(persistLink.generateQr).toBe('https://test-server.com:443/custom/qr');
      expect(persistLink.sendTestPingUrl).toBe('https://test-server.com:443/custom/ping_auth');
      expect(persistLink.getLinkToFilestorageTimeout).toBe(25000);
    });
  });

  describe('getQrAndLinkToDocument', () => {
    const documentId = 'doc-123';
    const mockResponse = {
      status: 200,
      data: {
        data: {
          link: 'https://example.com/link',
          qrCode: '<svg>QR code</svg>'
        }
      }
    };

    it('should successfully get QR and link to document', async () => {
      axios.mockResolvedValue(mockResponse);

      const result = await persistLink.getQrAndLinkToDocument(documentId);

      expect(result).toEqual(mockResponse.data.data);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://test-server.com:443/custom/qr',
        headers: {
          'Content-Type': 'application/json',
          token: 'test-token-123'
        },
        data: {
          type: 'simple',
          options: {
            url: `https://frontend.com/document/${documentId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: expect.any(Function)
      });

      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-document-request-params', expect.any(Object));
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-document-response', mockResponse.data.data);
    });

    it('should reject on axios error', async () => {
      const error = new Error('Network error');
      axios.mockRejectedValue(error);

      await expect(persistLink.getQrAndLinkToDocument(documentId)).rejects.toThrow('Network error');
      
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-document-response-error', error);
    });

    it('should reject on non-200 status code', async () => {
      const errorResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        data: null
      };
      axios.mockResolvedValue(errorResponse);

      await expect(persistLink.getQrAndLinkToDocument(documentId)).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('getQrAndLinkToCase', () => {
    const caseId = 'case-456';
    const mockResponse = {
      status: 200,
      data: {
        data: {
          link: 'https://example.com/case-link',
          qrCode: '<svg>Case QR code</svg>'
        }
      }
    };

    it('should successfully get QR and link to case', async () => {
      axios.mockResolvedValue(mockResponse);

      const result = await persistLink.getQrAndLinkToCase(caseId);

      expect(result).toEqual(mockResponse.data.data);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://test-server.com:443/custom/qr',
        headers: {
          'Content-Type': 'application/json',
          token: 'test-token-123'
        },
        data: {
          type: 'simple',
          options: {
            url: `https://frontend.com/case=${caseId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: expect.any(Function)
      });

      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-case-request-params', expect.any(Object));
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-case-response', mockResponse.data.data);
    });

    it('should reject on error', async () => {
      const error = new Error('Case error');
      axios.mockRejectedValue(error);

      await expect(persistLink.getQrAndLinkToCase(caseId)).rejects.toThrow('Case error');
      
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-case-response-error', error);
    });
  });

  describe('getQrAndLinkToProceeding', () => {
    const proceedingId = 'proc-789';
    const caseId = 'case-456';
    const mockResponse = {
      status: 200,
      data: {
        data: {
          link: 'https://example.com/proceeding-link',
          qrCode: '<svg>Proceeding QR code</svg>'
        }
      }
    };

    it('should successfully get QR and link to proceeding', async () => {
      axios.mockResolvedValue(mockResponse);

      const result = await persistLink.getQrAndLinkToProceeding(proceedingId, caseId);

      expect(result).toEqual(mockResponse.data.data);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://test-server.com:443/custom/qr',
        headers: {
          'Content-Type': 'application/json',
          token: 'test-token-123'
        },
        data: {
          type: 'simple',
          options: {
            url: `https://frontend.com/case=${caseId}/proceeding=${proceedingId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: expect.any(Function)
      });

      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-permission-request-params', expect.any(Object));
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-permission-response', mockResponse.data.data);
    });

    it('should reject on error', async () => {
      const error = new Error('Proceeding error');
      axios.mockRejectedValue(error);

      await expect(persistLink.getQrAndLinkToProceeding(proceedingId, caseId)).rejects.toThrow('Proceeding error');
      
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-permission-response-error', error);
    });
  });

  describe('Helper Methods', () => {
    const documentId = 'doc-123';
    const caseId = 'case-456';
    const proceedingId = 'proc-789';
    const mockQrAndLink = {
      link: 'https://example.com/link',
      qrCode: '<svg>QR code</svg>'
    };

    beforeEach(() => {
      // Mock the main methods
      persistLink.getQrAndLinkToDocument = jest.fn().mockResolvedValue(mockQrAndLink);
      persistLink.getQrAndLinkToCase = jest.fn().mockResolvedValue(mockQrAndLink);
      persistLink.getQrAndLinkToProceeding = jest.fn().mockResolvedValue(mockQrAndLink);
    });

    describe('getLinkToDocument', () => {
      it('should return only the link from getQrAndLinkToDocument', async () => {
        const result = await persistLink.getLinkToDocument(documentId);
        
        expect(result).toBe(mockQrAndLink.link);
        expect(persistLink.getQrAndLinkToDocument).toHaveBeenCalledWith(documentId);
      });
    });

    describe('getLinkToCase', () => {
      it('should return only the link from getQrAndLinkToCase', async () => {
        const result = await persistLink.getLinkToCase(caseId);
        
        expect(result).toBe(mockQrAndLink.link);
        expect(persistLink.getQrAndLinkToCase).toHaveBeenCalledWith(caseId);
      });
    });

    describe('getLinkToProceeding', () => {
      it('should return only the link from getQrAndLinkToProceeding', async () => {
        const result = await persistLink.getLinkToProceeding(proceedingId, caseId);
        
        expect(result).toBe(mockQrAndLink.link);
        expect(persistLink.getQrAndLinkToProceeding).toHaveBeenCalledWith(proceedingId, caseId);
      });
    });

    describe('getQrLinkToDocument', () => {
      it('should return only the QR code from getQrAndLinkToDocument', async () => {
        const result = await persistLink.getQrLinkToDocument(documentId);
        
        expect(result).toBe(mockQrAndLink.qrCode);
        expect(persistLink.getQrAndLinkToDocument).toHaveBeenCalledWith(documentId);
      });
    });
  });

  describe('getQrLinkToStaticFileInOpenStack', () => {
    const fileName = 'test-file.pdf';
    const mockResponse = {
      status: 200,
      data: {
        data: {
          qrCode: '<svg>Static file QR code</svg>'
        }
      }
    };

    it('should successfully get QR link to static file in OpenStack', async () => {
      axios.mockResolvedValue(mockResponse);

      const result = await persistLink.getQrLinkToStaticFileInOpenStack(fileName);

      expect(result).toBe(mockResponse.data.data.qrCode);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://test-server.com:443/custom/qr',
        headers: {
          'Content-Type': 'application/json',
          token: 'test-token-123'
        },
        data: {
          type: 'openStack',
          options: {
            serverName: 'test-server',
            fileName: fileName
          },
          small: true
        },
        validateStatus: expect.any(Function)
      });

      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-request-params', expect.any(Object));
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-response', mockResponse.data.data.qrCode);
    });

    it('should reject on error', async () => {
      const error = new Error('OpenStack error');
      axios.mockRejectedValue(error);

      await expect(persistLink.getQrLinkToStaticFileInOpenStack(fileName)).rejects.toThrow('OpenStack error');
      
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-response-error', error);
    });
  });

  describe('getLinkToStaticFileInFilestorage', () => {
    const fileId = 'file-123';
    const definedHash = 'hash-456';
    const mockResponse = {
      status: 200,
      data: {
        data: {
          link: 'https://filestorage.com/file/link'
        }
      }
    };

    it('should successfully get link to static file in Filestorage', async () => {
      axios.mockResolvedValue(mockResponse);

      const result = await persistLink.getLinkToStaticFileInFilestorage(fileId, definedHash);

      expect(result).toBe(mockResponse.data.data.link);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://test-server.com:443/custom/qr',
        headers: {
          'Content-Type': 'application/json',
          token: 'test-token-123'
        },
        data: {
          type: 'filestorage',
          options: {
            serverName: 'test-server',
            fileId: fileId
          },
          definedHash: definedHash,
          small: true
        },
        timeout: 25000,
        validateStatus: expect.any(Function)
      });

      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-request-params', expect.any(Object));
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-response', mockResponse.data.data);
    });

    it('should reject on error and log response data', async () => {
      const error = new Error('Filestorage error');
      error.response = { data: { error: 'File not found' } };
      axios.mockRejectedValue(error);

      await expect(persistLink.getLinkToStaticFileInFilestorage(fileId, definedHash)).rejects.toThrow('Filestorage error');
      
      expect(mockLog.save).toHaveBeenCalledWith('get-persist-link-to-static-file-response-error', { 
        error, 
        body: { error: 'File not found' } 
      });
    });
  });

  describe('sendPingRequest', () => {
    const mockResponseHeaders = {
      version: '1.0.0',
      customer: 'test-customer',
      environment: 'test'
    };
    const mockResponseData = { data: { status: 'ok' } };

    it('should successfully send ping request', async () => {
      axios.mockResolvedValue({
        status: 200,
        headers: mockResponseHeaders,
        data: mockResponseData
      });

      const result = await persistLink.sendPingRequest();

      expect(result).toEqual({
        version: '1.0.0',
        customer: 'test-customer',
        environment: 'test',
        body: { status: 'ok' }
      });

      expect(axios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://test-server.com:443/custom/ping_auth',
        headers: { token: 'test-token-123' },
        validateStatus: expect.any(Function)
      });
    });

    it('should reject on axios error', async () => {
      const error = new Error('Ping error');
      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      axios.mockRejectedValue(error);

      await expect(persistLink.sendPingRequest()).rejects.toThrow('Ping error');
      
      expect(consoleSpy).toHaveBeenCalledWith('error', error);
      consoleSpy.mockRestore();
    });

    it('should reject on non-200 status code', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      axios.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(persistLink.sendPingRequest()).rejects.toThrow('HTTP 500: Internal Server Error');
      
      expect(consoleSpy).toHaveBeenCalledWith('error', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle empty response body gracefully', async () => {
      axios.mockResolvedValue({
        status: 200,
        headers: mockResponseHeaders,
        data: {}
      });

      const result = await persistLink.sendPingRequest();

      expect(result).toEqual({
        version: '1.0.0',
        customer: 'test-customer',
        environment: 'test',
        body: undefined // Since result.data is undefined when parsing '{}'
      });
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing routes in custom config', () => {
      PersistLink.singleton = null;
      
      const customConfig = {
        server: 'https://custom.com',
        token: 'custom-token'
        // No routes provided
      };
      
      const instance = new PersistLink(customConfig);
      
      expect(instance.config.routes.generateQr).toBe('/link?qr=svg'); // Should use default
      expect(instance.generateQr).toBe('https://custom.com:443/link?qr=svg');
    });

    it('should handle partial routes in custom config', () => {
      PersistLink.singleton = null;
      
      const customConfig = {
        routes: {
          generateQr: '/custom/qr'
          // Other routes not provided
        }
      };
      
      const instance = new PersistLink(customConfig);
      
      expect(instance.config.routes.generateQr).toBe('/custom/qr');
      expect(instance.config.routes.ping).toBe('/test/ping'); // Should use default
    });
  });
});
