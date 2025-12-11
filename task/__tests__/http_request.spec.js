const nock = require('nock');
const HttpRequest = require('../src/lib/http_request');
const { getTraceId } = require('../src/lib/async_local_storage');

// Mock the async_local_storage module
jest.mock('../src/lib/async_local_storage', () => ({
  getTraceId: jest.fn()
}));

describe('HttpRequest', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    getTraceId.mockReturnValue('test-trace-id-123');
    
    // Clean all nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    // Ensure all nock interceptors were used
    nock.isDone();
  });

  describe('Static Properties', () => {
    it('should expose HTTP methods', () => {
      expect(HttpRequest.Methods).toEqual({
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE'
      });
    });

    it('should expose content types', () => {
      expect(HttpRequest.ContentTypes).toEqual({
        CONTENT_TYPE_JSON: 'application/json',
        CONTENT_TYPE_FORM_URL_ENCODED: 'application/x-www-form-urlencoded'
      });
    });

    it('should expose accept types', () => {
      expect(HttpRequest.Accepts).toEqual({
        ACCEPT_JSON: 'application/json'
      });
    });
  });

  describe('send', () => {
    const baseUrl = 'https://api.example.com';
    const testEndpoint = '/test';
    const fullUrl = `${baseUrl}${testEndpoint}`;

    it('should send a GET request successfully', async () => {
      const mockResponse = { success: true, data: 'test data' };
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      });

      expect(result).toEqual(mockResponse);
      expect(getTraceId).toHaveBeenCalled();
    });

    it('should send a POST request with JSON body', async () => {
      const requestBody = { name: 'test', value: 123 };
      const mockResponse = { id: 1, status: 'created' };
      
      nock(baseUrl)
        .post(testEndpoint, requestBody)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .matchHeader('content-type', 'application/json')
        .reply(201, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(result).toEqual(mockResponse);
    });

    it('should send a PUT request', async () => {
      const requestBody = { id: 1, name: 'updated' };
      const mockResponse = { success: true };
      
      nock(baseUrl)
        .put(testEndpoint, JSON.stringify(requestBody))
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      expect(result).toEqual(mockResponse);
    });

    it('should send a DELETE request', async () => {
      const mockResponse = { deleted: true };
      
      nock(baseUrl)
        .delete(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'DELETE'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle custom headers', async () => {
      const customHeaders = {
        'Authorization': 'Bearer token123',
        'Custom-Header': 'custom-value'
      };
      const mockResponse = { authenticated: true };
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .matchHeader('Authorization', 'Bearer token123')
        .matchHeader('Custom-Header', 'custom-value')
        .reply(200, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET',
        headers: customHeaders
      });

      expect(result).toEqual(mockResponse);
    });

    it('should return full response when fullResponse is true', async () => {
      const mockResponse = { data: 'test' };
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, mockResponse, {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        });

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      }, true);

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('body');
      expect(result.body).toEqual(mockResponse);
      expect(result.response.statusCode).toBe(200);
      expect(result.response.headers).toHaveProperty('content-type', 'application/json');
    });

    it('should handle non-JSON response bodies', async () => {
      const textResponse = 'plain text response';
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, textResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      });

      expect(result).toBe(textResponse);
    });

    it('should handle request timeout', async () => {
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .delay(2000)
        .reply(200, { data: 'delayed' });

      await expect(
        HttpRequest.send({
          url: fullUrl,
          method: 'GET',
          timeout: 1000
        })
      ).rejects.toThrow();
    });

    it('should reject on network error', async () => {
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .replyWithError('Network error');

      await expect(
        HttpRequest.send({
          url: fullUrl,
          method: 'GET'
        })
      ).rejects.toThrow('Network error');
    });

    it('should add trace id header when no headers provided', async () => {
      const mockResponse = { success: true };
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, mockResponse);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      });

      expect(result).toEqual(mockResponse);
      expect(getTraceId).toHaveBeenCalled();
    });
  });

  describe('sendHeadRequest', () => {
    const baseUrl = 'https://api.example.com';
    const testEndpoint = '/test';
    const fullUrl = `${baseUrl}${testEndpoint}`;

    it('should return specific header value from HEAD request', async () => {
      const headerValue = 'custom-header-value';
      
      nock(baseUrl)
        .head(testEndpoint)
        .reply(200, '', {
          'X-Custom-Header': headerValue,
          'Content-Length': '123'
        });

      const result = await HttpRequest.sendHeadRequest({
        url: fullUrl,
        method: 'HEAD'
      }, 'x-custom-header');

      expect(result).toBe(headerValue);
    });

    it('should return undefined for non-existent header', async () => {
      nock(baseUrl)
        .head(testEndpoint)
        .reply(200, '', {
          'Content-Length': '123'
        });

      const result = await HttpRequest.sendHeadRequest({
        url: fullUrl,
        method: 'HEAD'
      }, 'non-existent-header');

      expect(result).toBeUndefined();
    });

    it('should reject on network error', async () => {
      nock(baseUrl)
        .head(testEndpoint)
        .replyWithError('Network error');

      await expect(
        HttpRequest.sendHeadRequest({
          url: fullUrl,
          method: 'HEAD'
        }, 'content-length')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Body Parser Methods', () => {
    describe('getRawBody', () => {
      it('should return middleware function with default max body size', () => {
        const middleware = HttpRequest.getRawBody();
        expect(typeof middleware).toBe('function');
      });

      it('should return middleware function with custom max body size', () => {
        const middleware = HttpRequest.getRawBody('5mb');
        expect(typeof middleware).toBe('function');
      });
    });

    describe('getJsonBodyParser', () => {
      it('should return JSON body parser with default limit', () => {
        const parser = HttpRequest.getJsonBodyParser();
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });

      it('should return JSON body parser with custom limit', () => {
        const parser = HttpRequest.getJsonBodyParser('5mb');
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });
    });

    describe('getUrlencodedBodyParser', () => {
      it('should return urlencoded body parser', () => {
        const parser = HttpRequest.getUrlencodedBodyParser();
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });
    });

    describe('getFormDataBodyParser', () => {
      it('should return form data body parser', () => {
        const parser = HttpRequest.getFormDataBodyParser();
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });
    });

    describe('getFormDataBodyParserInMemory', () => {
      it('should return function that creates multer middleware', () => {
        const parserFactory = HttpRequest.getFormDataBodyParserInMemory();
        expect(typeof parserFactory).toBe('function');
        
        const parser = parserFactory({ fileSize: 1000000 });
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });
    });

    describe('getXmlBodyParser', () => {
      it('should return XML body parser', () => {
        const parser = HttpRequest.getXmlBodyParser();
        expect(parser).toBeDefined();
        expect(typeof parser).toBe('function');
      });
    });
  });

  describe('Express App Configuration Methods', () => {
    let mockApp;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      };
    });

    describe('parseBodyJson', () => {
      it('should configure app with JSON body parser with default size', () => {
        HttpRequest.parseBodyJson(mockApp);
        expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
      });

      it('should configure app with JSON body parser with custom size', () => {
        HttpRequest.parseBodyJson(mockApp, '5mb');
        expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    describe('parseBodyUrlencoded', () => {
      it('should configure app with urlencoded body parser', () => {
        HttpRequest.parseBodyUrlencoded(mockApp);
        expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
      });
    });
  });

  describe('Error Handling', () => {
    const baseUrl = 'https://api.example.com';
    const testEndpoint = '/test';
    const fullUrl = `${baseUrl}${testEndpoint}`;

    it('should handle HTTP error status codes', async () => {
      const errorResponse = { error: 'Not Found', message: 'Resource not found' };
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(404, errorResponse);

      // Note: The current implementation doesn't reject on HTTP error codes,
      // it only rejects on network errors. This test verifies current behavior.
      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      });

      expect(result).toEqual(errorResponse);
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedJson = '{"invalid": json}';
      
      nock(baseUrl)
        .get(testEndpoint)
        .matchHeader('x-trace-id', 'test-trace-id-123')
        .reply(200, malformedJson);

      const result = await HttpRequest.send({
        url: fullUrl,
        method: 'GET'
      });

      // Should return the raw string when JSON parsing fails
      expect(result).toBe(malformedJson);
    });
  });
});
