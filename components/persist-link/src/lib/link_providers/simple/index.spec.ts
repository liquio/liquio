const pipe = jest.fn();
const requestMock = jest.fn(() => ({ pipe }));

jest.mock('request', () => requestMock);

import SimpleLinkProvider from './index';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
});

describe('SimpleLinkProvider', () => {
  beforeEach(() => {
    (SimpleLinkProvider as any).singleton = undefined;
    jest.clearAllMocks();
  });

  describe('isValidOptions', () => {
    it.each([undefined, 'string', 42, []])('should return false when options is %p', (options) => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions(options as any)).toBe(false);
    });

    it('should throw when options is null (typeof null === "object")', () => {
      const provider = new SimpleLinkProvider({});
      expect(() => provider.isValidOptions(null as any)).toThrow();
    });

    it('should return false when url is missing', () => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({})).toBe(false);
    });

    it('should return false when url is not a string', () => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({ url: 123 })).toBe(false);
    });

    it('should return true when url is a string', () => {
      const provider = new SimpleLinkProvider({});
      expect(provider.isValidOptions({ url: 'https://example.com' })).toBe(true);
    });
  });

  describe('open', () => {
    it('should redirect when redirect option is true', async () => {
      const provider = new SimpleLinkProvider({});
      const res = createRes();

      await provider.open({ url: 'https://example.com', redirect: true }, res);

      expect(res.redirect).toHaveBeenCalledWith('https://example.com');
      expect(requestMock).not.toHaveBeenCalled();
    });

    it('should request and pipe the response by default', async () => {
      const provider = new SimpleLinkProvider({});
      const res = createRes();

      await provider.open({ url: 'https://example.com' }, res);

      expect(requestMock).toHaveBeenCalledWith({ url: 'https://example.com', method: 'GET' });
      expect(pipe).toHaveBeenCalledWith(res);
    });

    it('should use a custom method when provided', async () => {
      const provider = new SimpleLinkProvider({});
      const res = createRes();

      await provider.open({ url: 'https://example.com', method: 'POST' }, res);

      expect(requestMock).toHaveBeenCalledWith({ url: 'https://example.com', method: 'POST' });
    });

    it('should respond with 404 when options are invalid', async () => {
      const provider = new SimpleLinkProvider({});
      const res = createRes();

      await provider.open({}, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: { message: 'Not found.' } });
    });
  });

  it('should behave as a singleton', () => {
    const first = new SimpleLinkProvider({ a: 1 });
    const second = new SimpleLinkProvider({ a: 2 });

    expect(second).toBe(first);
    expect(second.config).toEqual({ a: 1 });
  });
});
