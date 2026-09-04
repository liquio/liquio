const logSave = jest.fn();
const appConfig = {
  sandbox: { sandboxOption: true },
  link_providers: { filestorage: { serversList: [] } },
};

jest.mock('../../context', () => ({
  getConfig: () => appConfig,
  getLog: () => ({ save: logSave }),
}));

const templateModelMock = jest.fn();
jest.mock('../../../models/template', () => templateModelMock);

const sandboxMock = jest.fn();
jest.mock('@liquio/back-core', () => ({ Sandbox: sandboxMock }));

const filestorageHandlerMock = jest.fn();
jest.mock('../filestorage/filestorage_handler', () => filestorageHandlerMock);

const registerProviderMock = jest.fn();
jest.mock('./providers/register', () => registerProviderMock);

const pdfCreate = jest.fn();
jest.mock('html-pdf', () => ({ create: pdfCreate }));

import ExternalLinkProvider from './index';
import FilestorageHandler from '../filestorage/filestorage_handler';
import RegisterProvider from './providers/register';
import { Sandbox } from '@liquio/back-core';
import TemplateModel from '../../../models/template';

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

const createProvider = (config: any = { register: { url: 'https://register.example.com' } }) => new ExternalLinkProvider(config);

describe('ExternalLinkProvider', () => {
  beforeEach(() => {
    (ExternalLinkProvider as any).singleton = undefined;
    jest.clearAllMocks();

    templateModelMock.mockImplementation(function (this: any) {
      this.findByNameAndMethod = jest.fn();
    });
    sandboxMock.mockImplementation(function (this: any, config: any) {
      this.config = config;
      this.evalWithArgs = jest.fn();
    });
    filestorageHandlerMock.mockImplementation(function (this: any, config: any) {
      this.config = config;
      this.connections = {};
    });
    registerProviderMock.mockImplementation(function (this: any, config: any) {
      this.config = config;
      this.getRecord = jest.fn();
    });
  });

  describe('constructor', () => {
    it('should wire up the template model, register provider, sandbox and filestorage handler', () => {
      const config = { register: { url: 'https://register.example.com' } };
      const provider = createProvider(config);

      expect(TemplateModel).toHaveBeenCalled();
      expect(RegisterProvider).toHaveBeenCalledWith(config.register);
      expect(Sandbox).toHaveBeenCalledWith(appConfig.sandbox);
      expect(FilestorageHandler).toHaveBeenCalledWith(appConfig.link_providers.filestorage);
      expect(provider.provider.register).toBeInstanceOf(RegisterProvider);
    });

    it('should behave as a singleton', () => {
      const first = createProvider();
      const second = createProvider();

      expect(second).toBe(first);
      expect(TemplateModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValidOptions', () => {
    it('should return false when options is not an object', () => {
      const provider = createProvider();
      expect(provider.isValidOptions('nope' as any)).toBe(false);
    });

    it('should return false when templateName is missing', () => {
      const provider = createProvider();
      expect(provider.isValidOptions({ templateMethod: 'getRecord', filter: {} } as any)).toBe(false);
    });

    it('should return false when templateMethod is missing', () => {
      const provider = createProvider();
      expect(provider.isValidOptions({ templateName: 'register', filter: {} } as any)).toBe(false);
    });

    it('should return false when filter is not an object', () => {
      const provider = createProvider();
      expect(provider.isValidOptions({ templateName: 'register', templateMethod: 'getRecord', filter: 'nope' } as any)).toBe(false);
    });

    it('should return true for a valid options object', () => {
      const provider = createProvider();
      expect(provider.isValidOptions({ templateName: 'register', templateMethod: 'getRecord', filter: {} })).toBe(true);
    });
  });

  describe('open', () => {
    const options = { templateName: 'register', templateMethod: 'getRecord', filter: { recordId: '1' } };

    it('should respond with 404 and not crash when options are missing entirely', async () => {
      const provider = createProvider();
      const res = createRes();

      await provider.open(undefined as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should respond with 404 when the template is not found', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue(null);
      const res = createRes();

      await provider.open(options, res);

      expect(provider.templateModel.findByNameAndMethod).toHaveBeenCalledWith('register', 'getRecord');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: { message: 'Not found.' } });
    });

    it('should fall back to getRecord when templateMethod is not a function on the register provider', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({ html: '<p>ok</p>' });
      provider.provider.register.getRecord.mockResolvedValue({ id: '1' });
      const res = createRes();

      await provider.open({ ...options, templateMethod: 'notARealMethod' }, res);

      expect(provider.provider.register.getRecord).toHaveBeenCalledWith(options.filter);
    });

    it('should respond with 404 when the provider returns no data', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({ html: '<p>ok</p>' });
      provider.provider.register.getRecord.mockResolvedValue(null);
      const res = createRes();

      await provider.open(options, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should render the html template with data resolved via lodash paths', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({
        html: '<p>{{name}}</p>',
        jsonMap: { name: 'record.name' },
      });
      provider.provider.register.getRecord.mockResolvedValue({ record: { name: 'Alice' } });
      const res = createRes();

      await provider.open(options, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('<p>Alice</p>');
    });

    it('should render the html template with data resolved via the sandbox for function jsonMap entries', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({
        html: '<p>{{name}}</p>',
        jsonMap: { name: '(recordData) => recordData.record.name' },
      });
      provider.provider.register.getRecord.mockResolvedValue({ record: { name: 'Bob' } });
      provider.sandbox.evalWithArgs.mockReturnValue('Bob (from sandbox)');
      const res = createRes();

      await provider.open(options, res);

      expect(provider.sandbox.evalWithArgs).toHaveBeenCalledWith(
        '(recordData) => recordData.record.name',
        [{ recordData: { record: { name: 'Bob' } } }],
        expect.objectContaining({ isAsync: true }),
      );
      expect(res.send).toHaveBeenCalledWith('<p>Bob (from sandbox)</p>');
    });

    it('should respond with json when responseFormat is json', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({
        html: '<p>{{name}}</p>',
        jsonMap: { name: 'record.name' },
      });
      provider.provider.register.getRecord.mockResolvedValue({ record: { name: 'Alice' } });
      const res = createRes();

      await provider.open(options, res, 'json');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice', global: expect.objectContaining({ currentDate: expect.any(String) }) }),
      );
      expect(res.set).not.toHaveBeenCalled();
    });

    it('should generate a pdf when responseFormat is pdf', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({
        pdf: '<p>{{name}}</p>',
        jsonMap: { name: 'record.name' },
      });
      provider.provider.register.getRecord.mockResolvedValue({ record: { name: 'Alice' } });
      const pipe = jest.fn();
      pdfCreate.mockReturnValue({ toStream: (cb: any) => cb(null, { pipe }) });
      const res = createRes();

      await provider.open(options, res, 'pdf');

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(pdfCreate).toHaveBeenCalledWith('<p>Alice</p>', expect.objectContaining({ orientation: 'portrait' }));
      expect(pipe).toHaveBeenCalledWith(res);
    });

    it('should respond with 500 when pdf generation fails', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({ pdf: '<p>ok</p>' });
      provider.provider.register.getRecord.mockResolvedValue({});
      pdfCreate.mockReturnValue({ toStream: (cb: any) => cb(new Error('boom'), null) });
      const res = createRes();

      await provider.open(options, res, 'pdf');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'External provider error.' });
    });

    it('should catch and log errors, responding with 500', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockRejectedValue(new Error('db down'));
      const res = createRes();

      await provider.open(options, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'External provider error.' });
      expect(logSave).toHaveBeenCalledWith('external-provider-error', { error: 'db down' });
    });
  });

  describe('getFileBase64', () => {
    it('should throw when no filestorage server name is configured', async () => {
      const provider = createProvider({ register: {} });

      await expect(provider.getFileBase64('file-id')).rejects.toThrow(
        'ExternalLinkProvider.getFileBase64. Cannot get file storage connection from config.',
      );
    });

    it('should return the base64-encoded file content', async () => {
      const provider = createProvider({ register: { filestorageServerName: 'main' } });
      const downloadFileWithoutStream = jest.fn().mockResolvedValue(Buffer.from('hello'));
      provider.filestorageHandler.connections.main = { downloadFileWithoutStream };

      const result = await provider.getFileBase64('file-id');

      expect(downloadFileWithoutStream).toHaveBeenCalledWith('file-id');
      expect(result).toBe(Buffer.from('hello').toString('base64'));
    });
  });

  describe('getTemplate', () => {
    const options = { templateName: 'register', templateMethod: 'getRecord', filter: {} };

    it('should respond with 404 when the template is not found', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue(null);
      const res = createRes();

      await provider.getTemplate(options, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should respond with the template data', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({
        id: 1,
        html: '<p>ok</p>',
        pdf: '<p>ok</p>',
        options: { pdfOptions: { format: 'A4' } },
      });
      const res = createRes();

      await provider.getTemplate(options, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        id: 1,
        html: '<p>ok</p>',
        pdf: '<p>ok</p>',
        pdfOptions: { format: 'A4' },
      });
    });

    it('should default pdfOptions to an empty object when not configured', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockResolvedValue({ id: 1, html: '', pdf: '' });
      const res = createRes();

      await provider.getTemplate(options, res);

      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ pdfOptions: {} }));
    });

    it('should catch and log errors, responding with 500', async () => {
      const provider = createProvider();
      provider.templateModel.findByNameAndMethod.mockRejectedValue(new Error('db down'));
      const res = createRes();

      await provider.getTemplate(options, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(logSave).toHaveBeenCalledWith('external-provider-error', { error: 'db down' });
    });
  });
});
