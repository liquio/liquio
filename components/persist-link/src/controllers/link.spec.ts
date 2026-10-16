const logSave = jest.fn();
jest.mock('../lib/context', () => ({ getLog: () => ({ save: logSave }) }));

const provider = { open: jest.fn(), getTemplate: jest.fn() };
jest.mock('../lib/link_providers', () =>
  jest.fn().mockImplementation(function (this: any) {
    this.list = { simple: provider };
  }),
);
jest.mock('../lib/link_generator', () =>
  jest.fn().mockImplementation(function (this: any) {
    this.defineDataByLink = jest.fn(async () => ({ type: 'simple', options: { url: 'http://example.com' } }));
  }),
);
const templateModel = { create: jest.fn(async (b) => b), update: jest.fn(async (_i, b) => b) };
jest.mock('../models/template', () =>
  jest.fn().mockImplementation(function () {
    return templateModel;
  }),
);
jest.mock('../lib/qr', () => jest.fn());
jest.mock('../lib/file_converter', () => jest.fn());

import LinkController, { isValidJsonMap } from './link';

const createRes = (headersSent = false) => ({
  headersSent,
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
});

describe('LinkController', () => {
  let controller: any;

  beforeEach(() => {
    delete (LinkController as any).singleton;
    jest.clearAllMocks();
    controller = new LinkController({});
  });

  describe('open', () => {
    it('should answer with a handled 500 when provider open rejects', async () => {
      provider.open.mockRejectedValueOnce(new Error('boom'));
      const res = createRes();

      await controller.open({ params: { hash: 'h' }, query: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should not write a second response when headers are already sent', async () => {
      provider.open.mockRejectedValueOnce(new Error('boom'));
      const res = createRes(true);

      await controller.open({ params: { hash: 'h' }, query: {} }, res);

      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('open with convert', () => {
    it.each([false, true])('should send nosniff and sandbox CSP on the converted stream (showInBrowser=%s)', async (show) => {
      const pipe = jest.fn().mockReturnValue({ on: jest.fn() });
      const converted = { on: jest.fn().mockReturnValue({ pipe }) };
      controller.fileConverter = { convertByStream: jest.fn().mockResolvedValue(converted) };
      provider.getFileStream = jest.fn().mockResolvedValue({});
      const res = createRes();

      await controller.open(
        { params: { hash: 'h' }, query: { convert: 'true', source_format: 'docx', target_format: 'pdf', show_in_browser: String(show) } },
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "sandbox; default-src 'none'");
      expect(pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('getTemplate', () => {
    it('should answer with a handled 500 when provider getTemplate rejects', async () => {
      provider.getTemplate.mockRejectedValueOnce(new Error('boom'));
      const res = createRes();

      await controller.getTemplate({ params: { hash: 'h' }, query: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('isValidJsonMap', () => {
    it.each([undefined, null, {}, { a: 'path', b: 'async () => 1' }])('accepts %p', (v) => {
      expect(isValidJsonMap(v)).toBe(true);
    });

    it.each([{ a: 1 }, { a: null }, { a: { b: 'c' } }, ['x'], 'str', 5, { a: 'x'.repeat(10001) }])('rejects %p', (v) => {
      expect(isValidJsonMap(v)).toBe(false);
    });
  });

  describe('createTemplate / updateTemplate', () => {
    it('should reject invalid jsonMap with 400 and not touch the model', async () => {
      const res = createRes();
      await controller.createTemplate({ body: { jsonMap: { a: 1 } } }, res);
      await controller.updateTemplate({ params: { id: 1 }, body: { jsonMap: { a: 1 } } }, createRes());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(templateModel.create).not.toHaveBeenCalled();
      expect(templateModel.update).not.toHaveBeenCalled();
    });

    it('should create template with valid jsonMap', async () => {
      await controller.createTemplate({ body: { jsonMap: { a: 'b' } } }, createRes());
      expect(templateModel.create).toHaveBeenCalled();
    });
  });
});
