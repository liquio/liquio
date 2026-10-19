const openStackHandlerMock = jest.fn();
jest.mock('./open_stack_handler', () => openStackHandlerMock);

import OpenStackLinkProvider from './index';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
});

const createStream = (headers: any = {}, statusCode = 200) => ({ pipe: jest.fn(), on: jest.fn(), headers, statusCode });

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

    it('should return false when fileName contains CR/LF or control characters', () => {
      const provider = new OpenStackLinkProvider({});
      expect(provider.isValidOptions({ serverName: 'main', fileName: 'a.txt\r\nSet-Cookie: x=1' })).toBe(false);
      expect(provider.isValidOptions({ serverName: 'main', fileName: 'a\u0000.txt' })).toBe(false);
      expect(provider.isValidOptions({ serverName: 'main', fileName: 'a\u007f.txt' })).toBe(false);
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

    it('should respond with 404 and not download or set headers for a CRLF fileName', async () => {
      const downloadFile = jest.fn();
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt\r\nX-Injected: 1' }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(downloadFile).not.toHaveBeenCalled();
    });

    it('should set the content-disposition header and pipe the file by default', async () => {
      const stream = createStream();
      const pipe = stream.pipe;
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=a.txt');
      expect(downloadFile).toHaveBeenCalledWith('a.txt');
      expect(pipe).toHaveBeenCalledWith(res);
    });

    it('should skip the content-disposition header when disabled in config', async () => {
      const stream = createStream();
      const pipe = stream.pipe;
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new OpenStackLinkProvider({ addContentDispositionHeader: false });
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Disposition', expect.anything());
      expect(pipe).toHaveBeenCalledWith(res);
    });

    it('should always send nosniff and the sandbox CSP', async () => {
      const downloadFile = jest.fn().mockResolvedValue(createStream({ 'content-type': 'text/html' }));
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.html' }, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "sandbox; default-src 'none'");
    });

    it('should send the safety headers even when the content-disposition header is disabled', async () => {
      const downloadFile = jest.fn().mockResolvedValue(createStream());
      const provider = new OpenStackLinkProvider({ addContentDispositionHeader: false });
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.html' }, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "sandbox; default-src 'none'");
    });

    it('should not let an upstream inline disposition override the attachment one', async () => {
      const downloadFile = jest.fn().mockResolvedValue(createStream({ 'content-disposition': 'inline' }));
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.html' }, res);

      expect(res.setHeader).not.toHaveBeenCalledWith('content-disposition', 'inline');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=a.html');
    });

    it('should copy upstream status and headers and pipe the file', async () => {
      const stream = createStream({ 'content-type': 'image/png', connection: 'keep-alive' }, 206);
      const downloadFile = jest.fn().mockResolvedValue(stream);
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.status).toHaveBeenCalledWith(206);
      expect(res.setHeader).toHaveBeenCalledWith('content-type', 'image/png');
      expect(res.setHeader).not.toHaveBeenCalledWith('connection', expect.anything());
    });

    it('should respond with 502 when the download request fails', async () => {
      const downloadFile = jest.fn().mockRejectedValue(new Error('timeout'));
      const provider = new OpenStackLinkProvider({});
      provider.openStackHandler.connections.main = { downloadFile };
      const res = createRes();

      await provider.open({ serverName: 'main', fileName: 'a.txt' }, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});
