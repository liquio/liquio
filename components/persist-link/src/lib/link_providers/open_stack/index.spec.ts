const openStackHandlerMock = jest.fn();
jest.mock('./open_stack_handler', () => openStackHandlerMock);

import OpenStackLinkProvider from './index';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
});

describe('OpenStackLinkProvider', () => {
  beforeEach(() => {
    (OpenStackLinkProvider as any).singleton = undefined;
    jest.clearAllMocks();
    openStackHandlerMock.mockImplementation(function (this: any, config: any) {
      this.config = config;
      this.connections = {};
    });
  });

  it('should instantiate the open stack handler with the provider config', () => {
    const config = { serversList: [] };
    new OpenStackLinkProvider(config);

    expect(openStackHandlerMock).toHaveBeenCalledWith(config);
  });

  describe('isValidOptions', () => {
    it('should return false when options is not an object', () => {
      const provider = new OpenStackLinkProvider({});
      expect(provider.isValidOptions(42 as any)).toBe(false);
    });

    it('should return false when serverName is missing', () => {
      const provider = new OpenStackLinkProvider({});
      expect(provider.isValidOptions({ fileName: 'a.txt' } as any)).toBe(false);
    });

    it('should return false when fileName is missing', () => {
      const provider = new OpenStackLinkProvider({});
      expect(provider.isValidOptions({ serverName: 'main' } as any)).toBe(false);
    });

    it('should return true for a valid options object', () => {
      const provider = new OpenStackLinkProvider({});
      expect(provider.isValidOptions({ serverName: 'main', fileName: 'a.txt' })).toBe(true);
    });
  });

  describe('open', () => {
    it('should respond with 404 when the connection is not found', async () => {
      const provider = new OpenStackLinkProvider({});
      const res = createRes();

      await provider.open({ serverName: 'missing', fileName: 'a.txt' }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: { message: 'Not found.' } });
    });

    it('should set the content-disposition header and pipe the file by default', async () => {
      const pipe = jest.fn();
      const downloadFile = jest.fn().mockResolvedValue({ pipe });
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=a.txt');
      expect(downloadFile).toHaveBeenCalledWith('a.txt');
      expect(pipe).toHaveBeenCalledWith(res);
    });

    it('should skip the content-disposition header when disabled in config', async () => {
      const pipe = jest.fn();
      const downloadFile = jest.fn().mockResolvedValue({ pipe });
      const provider = new OpenStackLinkProvider({ addContentDispositionHeader: false });
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(pipe).toHaveBeenCalledWith(res);
    });
  });
});
