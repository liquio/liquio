// Import.
import { AxiosError } from 'axios';

import { assertSecureUrl } from '../src/lib/link_providers/open_stack/open_stack_handler/secure_url';
import { isPublicError, PublicError, publicError } from '../src/lib/public_error';
import { setAppContext } from '../src/lib/context';
import FileConverterService from '../src/lib/file_converter';
import Helpers from '../src/lib/helpers';
import LinkProvider from '../src/lib/link_providers/link_provider';
import { StubServer } from './stub_server';

/**
 * Library helpers that no HTTP route reaches (or reaches only on a failure path), exercised in-process.
 */
describe('Library helpers', () => {
  beforeAll(() => {
    setAppContext({ log: { save: jest.fn() } });
  });

  it('should refuse insecure OpenStack urls unless allowed', () => {
    expect(() => assertSecureUrl('not a url', { name: 'x' }, 'server')).toThrow('Invalid OpenStack server URL');
    expect(() => assertSecureUrl('http://host', { name: 'x' }, 'server')).toThrow('must use https');
    expect(() => assertSecureUrl('http://host', { name: 'x', allowInsecure: true }, 'server')).not.toThrow();
    expect(() => assertSecureUrl('https://host', { name: 'x' }, 'server')).not.toThrow();
  });

  it('should expose only public error messages', () => {
    expect(isPublicError(null)).toBe(false);
    expect(isPublicError({ expose: true })).toBe(false);
    expect(isPublicError(new PublicError('safe'))).toBe(true);
    expect(publicError(new PublicError('safe'), 400)).toBe('safe');
    expect(publicError(new Error('secret'), 400)).toBe('Bad Request');
    expect(publicError(new Error('secret'), 500)).toBe('Internal server error');
    expect(publicError(new Error('secret'), 499)).toBe('Internal server error');
  });

  it('should require provider methods to be implemented', async () => {
    const provider: any = new (LinkProvider as any)({});
    expect(() => provider.isValidOptions()).toThrow();
    await expect(provider.open()).rejects.toThrow();
    expect(await provider.getFileStream()).toBeNull();
  });

  it('should convert by file id and validate arguments', async () => {
    const converter = new StubServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(req.url === '/api/v1/convert/by-file-id' ? 200 : 500, { 'Content-Type': 'text/plain' });
        res.end('converted');
      });
    });
    const url = await converter.start();
    (global as any).config = { file_converter: { isEnabled: true, url: `${url}/api/v1`, token: 'x', routes: {}, timeout: 5000 } };
    delete (FileConverterService as any).singleton;
    try {
      const service: any = new FileConverterService();
      const stream = await service.convertByFileId('f1', { sourceFormat: 'docx', targetFormat: 'pdf' });
      let text = '';
      for await (const chunk of stream) text += chunk;
      expect(text).toBe('converted');
      await expect(service.convertByFileId('', {})).rejects.toThrow('required');
      await expect(service.convertByStream(null, {})).rejects.toThrow('required');

      (global as any).config = { file_converter: { isEnabled: true, url: '', token: '' } };
      delete (FileConverterService as any).singleton;
      expect(() => new FileConverterService()).toThrow('configuration error');

      (global as any).config = { file_converter: { isEnabled: false } };
      delete (FileConverterService as any).singleton;
      expect(() => (new FileConverterService() as any).client).toThrow('disabled');
    } finally {
      delete (global as any).config;
      delete (FileConverterService as any).singleton;
      await converter.stop();
    }
  });

  it('should cut long strings and objects', () => {
    expect(Helpers.cutLongStrings('short')).toBe('short');
    expect(Helpers.cutLongStrings('x'.repeat(100))).toBe(`${'x'.repeat(77)}...`);
    expect(Helpers.cutLongStrings(5)).toBe(5);
    expect(Helpers.cutLongStrings({ a: 'b' })).toEqual({ a: 'b' });
    expect(Helpers.cutLongStrings(JSON.stringify({ a: 'x'.repeat(200) }))).toBeDefined();
    expect(JSON.stringify(Helpers.cutLongStrings({ a: 'x'.repeat(500), b: ['y'.repeat(500)] })).length).toBeLessThanOrEqual(120);
    expect(Helpers.cutLongStrings({ a: 'x'.repeat(5000), b: 'y'.repeat(5000) }, 100)).toBeDefined();
    expect(Helpers.cutLongStrings(Object.fromEntries(Array.from({ length: 50 }, (_v, i) => [`k${i}`, i])), 50)).toBeDefined();
    expect(Helpers.replaceObjValues({ a: [1, { b: 2 }] }, (v) => (typeof v === 'number' ? v + 1 : v))).toEqual({ a: [2, { b: 3 }] });
  });

  it('should mask sensitive values in strings', () => {
    expect(Helpers.sensitiveReplace(5)).toBe(5);
    expect(Helpers.sensitiveReplace('x', [])).toBe('x');
    expect(Helpers.sensitiveReplace('{"token": "abc", "a": "b"}')).toBe('{"token": "****", "a": "b"}');
    expect(Helpers.sensitiveReplace('https://h/?_token=abc&x=1')).toBe('https://h/?_token=****&x=1');
  });

  it('should check buffer mime types and transform functions to async', () => {
    expect(Helpers.isCorrectBufferMimeType(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'pdf')).toBe(true);
    expect(Helpers.isCorrectBufferMimeType(new Uint8Array([0, 0, 0]), 'image/jpeg')).toBe(false);
    expect(() => Helpers.isCorrectBufferMimeType('x', 'pdf')).toThrow('Invalid buffer');
    expect(() => Helpers.isCorrectBufferMimeType(new Uint8Array([1]), 'zip')).toThrow('Unknown mimeType');

    expect(Helpers.transformFunctionToAsync('() => 1', ['load'])).toBe('() => 1');
    expect(Helpers.transformFunctionToAsync('() => load(1)', ['load'])).toBe('async () => await load(1)');
    expect(Helpers.transformFunctionToAsync('async () => await load(1)', ['load'])).toBe('async () => await load(1)');
  });

  it('should prepare axios errors to log', () => {
    expect(Helpers.prepareAxiosErrorToLog(new Error('plain'))).toEqual({ error: 'Error: plain' });
    const axiosError: any = new AxiosError('failed', 'ERR_BAD_REQUEST', { url: '/x', method: 'get', baseURL: 'http://h', headers: {} } as any, null, {
      status: 404,
      statusText: 'Not Found',
      data: { error: 'nf' },
    } as any);
    expect(Helpers.prepareAxiosErrorToLog(axiosError)).toMatchObject({
      status: 404,
      method: 'GET',
      url: 'http://h/x',
      responseData: { error: 'nf' },
    });
    expect(Helpers.prepareAxiosErrorToLog(axiosError, { withHeaders: true })).toHaveProperty('headers');
  });
});
