const logSave = jest.fn();
jest.mock('../../context', () => ({ getLog: () => ({ save: logSave }) }));

const httpMock = { stream: jest.fn(), send: jest.fn() };
jest.mock('../../http_request', () => ({ __esModule: true, default: httpMock }));

import SimpleLinkProvider from './index';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
});

const BAD_URLS = ['file:///etc/passwd', 'ftp://example.com/x', 'javascript:alert(1)', 'gopher://127.0.0.1:70/', 'not a url', '/relative', ''];

describe('SimpleLinkProvider', () => {
  beforeEach(() => {
    (SimpleLinkProvider as any).singleton = undefined;
    jest.clearAllMocks();
  });

  describe('isValidOptions', () => {
    it.each([undefined, null, 'string', 42])('should return false when options is %p', (options) => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions(options as any)).toBe(false);
    });

    it('should return false when url is missing or not a string', () => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({})).toBe(false);
      expect(provider.isValidOptions({ url: 123 })).toBe(false);
    });

    it.each(BAD_URLS)('should return false for url %p', (url) => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({ url })).toBe(false);
    });

    it.each(['http://example.com', 'https://example.com/path?a=1'])('should return true for %p', (url) => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({ url })).toBe(true);
    });
  });

  describe('open', () => {
    it.each(['http://example.com/a', 'https://example.com/b'])('should redirect to %p', async (url) => {
      const res = createRes();
      await new SimpleLinkProvider({}).open({ url, redirect: true }, res);
      expect(res.redirect).toHaveBeenCalledWith(url);
    });

    it.each([{ redirect: false }, { method: 'POST' }, {}])('should still only redirect with legacy options %p', async (legacy) => {
      const res = createRes();
      await new SimpleLinkProvider({}).open({ url: 'http://127.0.0.1:1/', ...legacy }, res);
      expect(res.redirect).toHaveBeenCalledWith('http://127.0.0.1:1/');
      expect(httpMock.stream).not.toHaveBeenCalled();
      expect(httpMock.send).not.toHaveBeenCalled();
    });

    it.each(BAD_URLS)('should respond with 404 and not redirect for %p', async (url) => {
      const res = createRes();
      await new SimpleLinkProvider({}).open({ url }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: { message: 'Not found.' } });
      expect(res.redirect).not.toHaveBeenCalled();
      expect(logSave).toHaveBeenCalledWith('simple-invalid-options', expect.anything());
    });

    it.each([null, undefined, {}, { url: 'file:///etc/passwd' }])(
      'should respond exactly once and make no upstream request for options %p',
      async (options) => {
        const res = createRes();
        await new SimpleLinkProvider({}).open(options, res);
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.redirect).not.toHaveBeenCalled();
        expect(httpMock.stream).not.toHaveBeenCalled();
        expect(httpMock.send).not.toHaveBeenCalled();
      },
    );

    it('should respond with 404 when options are invalid', async () => {
      const res = createRes();
      await new SimpleLinkProvider({}).open(null, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  it('should behave as a singleton', () => {
    const first = new SimpleLinkProvider({ a: 1 });
    const second = new SimpleLinkProvider({ a: 2 });

    expect(second).toBe(first);
    expect(second.config).toEqual({ a: 1 });
  });
});
