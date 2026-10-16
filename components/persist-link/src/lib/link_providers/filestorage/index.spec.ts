const logSave = jest.fn();

jest.mock('../../context', () => ({
  getLog: () => ({ save: logSave }),
}));

const filestorageHandlerMock = jest.fn();
jest.mock('./filestorage_handler', () => filestorageHandlerMock);

import FilestorageLinkProvider from './index';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

const createStream = () => {
  const stream: any = {
    on: jest.fn().mockReturnThis(),
    pipe: jest.fn(),
  };
  stream.pipe.mockReturnValue(stream);
  return stream;
};

describe('FilestorageLinkProvider', () => {
  beforeEach(() => {
    (FilestorageLinkProvider as any).singleton = undefined;
    jest.clearAllMocks();
    filestorageHandlerMock.mockImplementation(function (this: any, config: any) {
      this.config = config;
      this.connections = {};
    });
  });

  it('should instantiate the filestorage handler with the provider config', () => {
    const config = { serversList: [] };
    new FilestorageLinkProvider(config);

    expect(filestorageHandlerMock).toHaveBeenCalledWith(config);
  });

  describe('isValidOptions', () => {
    it('should return false when options is not an object', () => {
      const provider = new FilestorageLinkProvider({});
      expect(provider.isValidOptions('string' as any)).toBe(false);
    });

    it('should return false when serverName is missing', () => {
      const provider = new FilestorageLinkProvider({});
      expect(provider.isValidOptions({ fileId: '1' } as any)).toBe(false);
    });

    it('should return false when fileId is missing', () => {
      const provider = new FilestorageLinkProvider({});
      expect(provider.isValidOptions({ serverName: 'main' } as any)).toBe(false);
    });

    it('should return true for a valid options object', () => {
      const provider = new FilestorageLinkProvider({});
      expect(provider.isValidOptions({ serverName: 'main', fileId: '1' })).toBe(true);
    });
  });

  describe('open', () => {
    it('should respond with 404 when the connection is not found', async () => {
      const provider = new FilestorageLinkProvider({});
      const res = createRes();

      await provider.open({ serverName: 'missing', fileId: '1' }, res, null, {});

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: { message: 'Not found.' } });
      expect(logSave).toHaveBeenCalledWith('filestorage-invalid-connection', expect.any(Object));
    });

    it('should download and pipe the file when the connection exists', async () => {
      const stream = createStream();
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new FilestorageLinkProvider({});
      provider.filestorageHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileId: '1' }, res, null, {});

      expect(downloadFile).toHaveBeenCalledWith('1', { isP7s: false });
      expect(stream.pipe).toHaveBeenCalledWith(res);
    });

    it('should pass isP7s through to downloadFile', async () => {
      const stream = createStream();
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new FilestorageLinkProvider({});
      provider.filestorageHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileId: '1', isP7s: true }, res, null, {});

      expect(downloadFile).toHaveBeenCalledWith('1', { isP7s: true });
    });

    it('should set the inline content-disposition header when showInBrowser is true', async () => {
      const stream = createStream();
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new FilestorageLinkProvider({});
      provider.filestorageHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileId: '1' }, res, null, { showInBrowser: true });

      const onResponse = stream.on.mock.calls.find(([event]: [string]) => event === 'response')[1];
      const fakeResponse = { headers: { 'content-type': 'application/pdf' } };
      onResponse(fakeResponse);

      expect(fakeResponse.headers['Content-Disposition']).toBe('inline');
      expect(fakeResponse.headers['Accept-Ranges']).toBe('bytes');
    });
  });

  describe('open response headers', () => {
    const run = async (contentType: string | undefined, showInBrowser: boolean, extra: any = {}, config: any = {}) => {
      const stream = createStream();
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new FilestorageLinkProvider(config);
      provider.filestorageHandler.connections.main = { downloadFile };
      await provider.open({ serverName: 'main', fileId: '1' }, createRes(), null, { showInBrowser });
      const onResponse = stream.on.mock.calls.find(([event]: [string]) => event === 'response')[1];
      const fakeResponse = { headers: contentType ? { 'content-type': contentType, ...extra } : { ...extra } };
      onResponse(fakeResponse);
      return fakeResponse.headers as any;
    };

    it.each(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'application/pdf; charset=binary'])(
      'should show %s inline when showInBrowser is true',
      async (type) => {
        expect((await run(type, true))['Content-Disposition']).toBe('inline');
      },
    );

    it.each(['text/html', 'text/html; charset=utf-8', 'image/svg+xml', 'application/xhtml+xml', undefined])(
      'should force attachment for %s with and without showInBrowser',
      async (type) => {
        expect((await run(type, true))['Content-Disposition']).toBe('attachment');
        expect((await run(type, false, { 'content-disposition': 'inline' }))['Content-Disposition']).toBe('attachment');
      },
    );

    it('should keep the upstream filename when forcing attachment', async () => {
      const headers = await run('text/html', true, { 'content-disposition': 'inline; filename="a.html"' });
      expect(headers['Content-Disposition']).toBe('attachment; filename="a.html"');
      expect(headers['content-disposition']).toBeUndefined();
    });

    it('should not change the disposition of allowed types when showInBrowser is false', async () => {
      const headers = await run('application/pdf', false, { 'content-disposition': 'attachment; filename="a.pdf"' });
      expect(headers['content-disposition']).toBe('attachment; filename="a.pdf"');
      expect(headers['Content-Disposition']).toBeUndefined();
    });

    it.each([
      ['application/pdf', true],
      ['text/html', true],
      ['image/svg+xml', false],
    ])('should always set nosniff and sandbox CSP (%s, showInBrowser=%s)', async (type, show) => {
      const headers = await run(type, show);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Content-Security-Policy']).toBe("sandbox; default-src 'none'");
    });

    it('should honour a configured inlineContentTypes list but never allow html or svg', async () => {
      const config = { inlineContentTypes: ['text/plain', 'text/html', 'image/svg+xml'] };
      expect((await run('text/plain', true, {}, config))['Content-Disposition']).toBe('inline');
      expect((await run('application/pdf', true, {}, config))['Content-Disposition']).toBe('attachment');
      expect((await run('text/html', true, {}, config))['Content-Disposition']).toBe('attachment');
      expect((await run('image/svg+xml', true, {}, config))['Content-Disposition']).toBe('attachment');
    });
  });

  describe('getFileStream', () => {
    it('should throw when options are invalid', async () => {
      const provider = new FilestorageLinkProvider({});
      await expect(provider.getFileStream({} as any)).rejects.toThrow('Invalid options.');
    });

    it('should throw when the connection is not found', async () => {
      const provider = new FilestorageLinkProvider({});
      await expect(provider.getFileStream({ serverName: 'missing', fileId: '1' })).rejects.toThrow('Connection not found.');
    });

    it('should return the downloaded stream when the connection exists', async () => {
      const stream = createStream();
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new FilestorageLinkProvider({});
      provider.filestorageHandler.connections.main = { downloadFile };

      const result = await provider.getFileStream({ serverName: 'main', fileId: '1' });

      expect(downloadFile).toHaveBeenCalledWith('1', { isP7s: false });
      expect(result).toBe(stream);
    });
  });
});
