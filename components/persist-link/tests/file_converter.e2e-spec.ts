// Import.
import { Readable } from 'node:stream';

import FileConverterService from '../src/lib/file_converter';
import { setAppContext } from '../src/lib/context';
import { StubServer } from './stub_server';

/**
 * FileConverterService reads the global config, which is not set in the e2e app, so the service is created directly here
 * with a test-provided config against a local converter stub that answers with an error status.
 */
describe('FileConverterService error paths against a local converter stub', () => {
  let stub: StubServer;
  let service: any;
  const logSave = jest.fn();

  beforeAll(async () => {
    setAppContext({ log: { save: logSave } });
    stub = new StubServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'converter failed' }));
    });
    const url = await stub.start();
    setAppContext({ config: { file_converter: { isEnabled: true, url, token: 'converter-token', timeout: 5000 } } });
    delete (FileConverterService as any).singleton;
    service = new FileConverterService();
  });

  afterAll(async () => {
    setAppContext({ config: undefined });
    delete (FileConverterService as any).singleton;
    await stub.stop();
  });

  beforeEach(() => logSave.mockClear());

  it('should log axios fields and throw a converting error on convertByStream failure', async () => {
    const error = await service
      .convertByStream(Readable.from(['data']), { fileName: 'a.docx', sourceFormat: 'docx', targetFormat: 'pdf' })
      .catch((e) => e);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.message).toBe('File converting error.');
    const errorLog = logSave.mock.calls.find((c) => c[0] === 'file-converter-service|convert-by-stream|error');
    expect(errorLog[1]).toMatchObject({
      fileName: 'a.docx',
      status: 500,
      method: 'POST',
      url: expect.stringContaining('/convert/by-stream/docx/to/pdf'),
    });
    expect(errorLog[2]).toBe('error');
  });

  it('should log axios fields and throw a converting error on convertByFileId failure', async () => {
    const error = await service.convertByFileId('f1', { sourceFormat: 'docx', targetFormat: 'pdf' }).catch((e) => e);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.message).toBe('File converting error.');
    const errorLog = logSave.mock.calls.find((c) => c[0] === 'file-converter-service|convert-by-file-id|error');
    expect(errorLog[1]).toMatchObject({ fileId: 'f1', status: 500, method: 'POST', url: expect.stringContaining('/convert/by-file-id') });
    expect(errorLog[2]).toBe('error');
  });
});
