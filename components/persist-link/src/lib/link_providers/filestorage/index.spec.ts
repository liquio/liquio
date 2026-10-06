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
      const fakeResponse = { headers: {} };
      onResponse(fakeResponse);

      expect(fakeResponse.headers['Content-Disposition']).toBe('inline');
      expect(fakeResponse.headers['Accept-Ranges']).toBe('bytes');
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
