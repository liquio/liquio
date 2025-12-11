const nock = require('nock');
const bodyParser = require('body-parser');
const HttpRequest = require('./http_request');

// Mock body-parser
jest.mock('body-parser', () => ({
  json: jest.fn(() => 'jsonParser'),
  urlencoded: jest.fn(() => 'urlencodedParser'),
}));

describe('HttpRequest', () => {
  beforeAll(() => {
    // Disable net connect to ensure all requests are mocked
    nock.disableNetConnect();
    
    // Use real timers to avoid timer-related issues
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Clean any existing mocks before each test
    nock.cleanAll();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Clean up any interceptors after each test
    nock.cleanAll();
    
    // Add a small delay to allow connections to close
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterAll(async () => {
    // Clean up HTTP agents and connections
    HttpRequest.cleanup();
    // Clean up and restore everything
    nock.cleanAll();
    nock.enableNetConnect();
    nock.restore();
    
    // Give some time for cleanup to complete
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 50);
      timer.unref?.(); // Unref the timer so it doesn't keep the process alive
    });
  });

  describe('Static Properties', () => {
    describe('Methods', () => {
      it('should return correct HTTP methods', () => {
        const methods = HttpRequest.Methods;
        
        expect(methods).toEqual({
          GET: 'GET',
          POST: 'POST',
          PUT: 'PUT',
          DELETE: 'DELETE',
        });
      });
    });

    describe('ContentTypes', () => {
      it('should return correct content types', () => {
        const contentTypes = HttpRequest.ContentTypes;
        
        expect(contentTypes).toEqual({
          CONTENT_TYPE_JSON: 'application/json',
          CONTENT_TYPE_FORM_URL_ENCODED: 'application/x-www-form-urlencoded',
        });
      });
    });

    describe('Accepts', () => {
      it('should return correct accept types', () => {
        const accepts = HttpRequest.Accepts;
        
        expect(accepts).toEqual({
          ACCEPT_JSON: 'application/json',
        });
      });
    });
  });

  describe('send', () => {
    const mockRequestOptions = {
      url: 'https://api.example.com/test',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token' },
      timeout: 5000,
    };

    it('should successfully send a request and return parsed JSON body', async () => {
      const mockResponseBody = { status: 'success', data: { id: 1 } };

      nock('https://api.example.com')
        .get('/test')
        .matchHeader('Authorization', 'Bearer token')
        .reply(200, mockResponseBody);

      const result = await HttpRequest.send(mockRequestOptions);

      expect(result).toEqual(mockResponseBody);
    });

    it('should return original body when JSON parsing fails', async () => {
      const mockResponseBody = 'plain text response';

      nock('https://api.example.com')
        .get('/test')
        .reply(200, mockResponseBody);

      const result = await HttpRequest.send(mockRequestOptions);

      expect(result).toBe(mockResponseBody);
    });

    it('should handle empty response body', async () => {
      nock('https://api.example.com')
        .get('/test')
        .reply(200, '');

      const result = await HttpRequest.send(mockRequestOptions);

      expect(result).toBe('');
    });

    it('should handle null response body', async () => {
      nock('https://api.example.com')
        .get('/test')
        .reply(200, null);

      const result = await HttpRequest.send(mockRequestOptions);

      expect(result).toBeNull();
    });

    it('should handle undefined response body', async () => {
      nock('https://api.example.com')
        .get('/test')
        .reply(200);

      const result = await HttpRequest.send(mockRequestOptions);

      expect(result).toBe('');
    });

    it('should reject when request returns an error', async () => {
      nock('https://api.example.com')
        .get('/test')
        .replyWithError('Network error');

      await expect(HttpRequest.send(mockRequestOptions))
        .rejects
        .toThrow('Network error');
    });

    it('should handle different HTTP methods', async () => {
      const postOptions = {
        ...mockRequestOptions,
        method: 'POST',
        body: '{"name": "test"}',
      };

      nock('https://api.example.com')
        .post('/test', { name: 'test' })
        .reply(201, { created: true });

      const result = await HttpRequest.send(postOptions);

      expect(result).toEqual({ created: true });
    });

    it('should handle request with body parameter', async () => {
      const requestWithBody = {
        ...mockRequestOptions,
        method: 'POST',
        body: JSON.stringify({ name: 'test', value: 42 }),
      };

      nock('https://api.example.com')
        .post('/test', { name: 'test', value: 42 })
        .reply(200, { success: true });

      const result = await HttpRequest.send(requestWithBody);

      expect(result).toEqual({ success: true });
    });

    it('should handle request without optional parameters', async () => {
      const minimalOptions = {
        url: 'https://api.example.com/minimal',
        method: 'GET',
      };

      nock('https://api.example.com')
        .get('/minimal')
        .reply(200, { minimal: true });

      const result = await HttpRequest.send(minimalOptions);

      expect(result).toEqual({ minimal: true });
    });

    it('should handle PUT requests', async () => {
      const putOptions = {
        url: 'https://api.example.com/users/123',
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated User' }),
        headers: { 'Content-Type': 'application/json' },
      };

      nock('https://api.example.com')
        .put('/users/123', { name: 'Updated User' })
        .matchHeader('Content-Type', 'application/json')
        .reply(200, { id: 123, name: 'Updated User' });

      const result = await HttpRequest.send(putOptions);

      expect(result).toEqual({ id: 123, name: 'Updated User' });
    });

    it('should handle DELETE requests', async () => {
      const deleteOptions = {
        url: 'https://api.example.com/users/123',
        method: 'DELETE',
      };

      nock('https://api.example.com')
        .delete('/users/123')
        .reply(204);

      const result = await HttpRequest.send(deleteOptions);

      expect(result).toBe('');
    });

    it('should handle different status codes', async () => {
      // Test 404 error response
      nock('https://api.example.com')
        .get('/test')
        .reply(404, { error: 'Not found' });

      const result404 = await HttpRequest.send(mockRequestOptions);
      expect(result404).toEqual({ error: 'Not found' });

      // Test 500 error response  
      nock('https://api.example.com')
        .get('/test')
        .reply(500, 'Internal Server Error');

      const result500 = await HttpRequest.send(mockRequestOptions);
      expect(result500).toEqual('Internal Server Error');
    });
  });

  describe('parseBodyJson', () => {
    let mockApp;

    beforeEach(() => {
      mockApp = {
        use: jest.fn(),
      };
    });

    it('should configure JSON body parser with default max size', () => {
      HttpRequest.parseBodyJson(mockApp);

      expect(bodyParser.json).toHaveBeenCalledWith({ limit: '10mb' });
      expect(mockApp.use).toHaveBeenCalledWith('jsonParser');
    });

    it('should configure JSON body parser with custom max size', () => {
      const customMaxSize = '50mb';
      
      HttpRequest.parseBodyJson(mockApp, customMaxSize);

      expect(bodyParser.json).toHaveBeenCalledWith({ limit: customMaxSize });
      expect(mockApp.use).toHaveBeenCalledWith('jsonParser');
    });

    it('should handle undefined max size parameter', () => {
      HttpRequest.parseBodyJson(mockApp, undefined);

      expect(bodyParser.json).toHaveBeenCalledWith({ limit: '10mb' });
      expect(mockApp.use).toHaveBeenCalledWith('jsonParser');
    });
  });

  describe('parseBodyUrlencoded', () => {
    let mockApp;

    beforeEach(() => {
      mockApp = {
        use: jest.fn(),
      };
    });

    it('should configure URL-encoded body parser with extended false', () => {
      HttpRequest.parseBodyUrlencoded(mockApp);

      expect(bodyParser.urlencoded).toHaveBeenCalledWith({ extended: false });
      expect(mockApp.use).toHaveBeenCalledWith('urlencodedParser');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle a complete HTTP request flow', async () => {
      const requestOptions = {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
        timeout: 10000,
      };

      const mockResponse = {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        created_at: '2025-09-11T10:00:00Z',
      };

      nock('https://api.example.com')
        .post('/users', { name: 'John Doe', email: 'john@example.com' })
        .matchHeader('Content-Type', 'application/json')
        .matchHeader('Accept', 'application/json')
        .reply(201, mockResponse);

      const result = await HttpRequest.send(requestOptions);

      expect(result).toEqual(mockResponse);
    });

    it('should handle various response content types', async () => {
      const requestOptions = {
        url: 'https://api.example.com/content-test',
        method: 'GET',
      };

      // Test successful response
      nock('https://api.example.com')
        .get('/content-test')
        .reply(200, { success: true });

      const result200 = await HttpRequest.send(requestOptions);
      expect(result200).toEqual({ success: true });

      // Test 404 error response
      nock('https://api.example.com')
        .get('/content-test')
        .reply(404, { error: 'Not found' });

      const result404 = await HttpRequest.send(requestOptions);
      expect(result404).toEqual({ error: 'Not found' });

      // Test 500 error response
      nock('https://api.example.com')
        .get('/content-test')
        .reply(500, 'Internal Server Error');

      const result500 = await HttpRequest.send(requestOptions);
      expect(result500).toEqual('Internal Server Error');
    });

    it('should handle timeout scenarios', async () => {
      const requestOptions = {
        url: 'https://api.example.com/slow',
        method: 'GET',
        timeout: 1000,
      };

      nock('https://api.example.com')
        .get('/slow')
        .delay(2000)
        .reply(200, { data: 'slow response' });

      await expect(HttpRequest.send(requestOptions))
        .rejects
        .toThrow();
    });

    it('should handle network connection errors', async () => {
      const requestOptions = {
        url: 'https://api.example.com/error-test',
        method: 'GET',
      };

      nock('https://api.example.com')
        .get('/error-test')
        .replyWithError('ECONNREFUSED');

      await expect(HttpRequest.send(requestOptions))
        .rejects
        .toThrow();
    });
  });
});
