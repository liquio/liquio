// Import.
import { Readable } from 'node:stream';

import FileStorageConnection from '../src/lib/link_providers/filestorage/filestorage_handler/filestorage_connection';
import { setAppContext } from '../src/lib/context';
import { StubServer } from './stub_server';

const readAll = async (stream: any): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
};

/**
 * The filestorage client is used in-process by the link providers; its write-side methods are not reachable through
 * persist-link's HTTP API, so they are exercised here against a local HTTP stub of the filestorage service.
 */
describe('FileStorageConnection against a local filestorage stub', () => {
  let stub: StubServer;
  let connection: any;

  beforeAll(async () => {
    setAppContext({ log: { save: jest.fn() } });
    stub = new StubServer((req, res) => {
      const url = req.url || '';
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const json = (payload: any, status = 200) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (url.startsWith('/files/bad-download')) {
          res.writeHead(404);
          return res.end('missing');
        }
        if (url.startsWith('/files?container_id=')) {
          return json(body.includes('reject') ? { error: { message: 'Rejected.' } } : { data: { id: 'new-file', size: body.length } });
        }
        if (url.endsWith('/info')) return json({ data: { id: 'f1', name: 'a.txt' } });
        if (url === '/test/ping_with_auth') return json({ data: { processPid: 1 } });
        if (url.endsWith('/preview') || url.endsWith('/zip')) {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          return res.end(url);
        }
        if (url.startsWith('/files/') && url.includes('/p7s') && req.method === 'GET') {
          if (url.includes('as_file')) {
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            return res.end('p7s-bytes');
          }
          return json({ data: 'p7s-base64' });
        }
        if (url.startsWith('/files/') && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          return res.end('file-bytes');
        }
        if (url.endsWith('/copy')) return json({ data: { id: 'copy-1' } });
        if (url.startsWith('/signatures') && req.method === 'GET') return json({ data: [{ id: 's1' }] });
        if (url === '/signatures') return json({ data: { id: 's2', received: JSON.parse(body).fileId } });
        if (url === '/p7s_signatures') return json({ data: { id: 'p1' } });
        if (url.startsWith('/p7s_signatures/') && req.method === 'PUT') return json({ data: { id: 'p1', updated: true } });
        if (url.startsWith('/p7s_signatures/') && req.method === 'DELETE') return json({ data: { deleted: true } });
        json({ error: 'unexpected' }, 500);
      });
    });
    const apiHost = await stub.start();
    delete (FileStorageConnection as any).singleton;
    connection = new FileStorageConnection({ apiHost, token: 'downstream-token', containerId: 'c1' });
  });

  afterAll(async () => {
    delete (FileStorageConnection as any).singleton;
    await stub.stop();
  });

  it('should read file info and check the token', async () => {
    expect(await connection.getFileInfo('f1')).toEqual({ id: 'f1', name: 'a.txt' });
    expect((await connection.checkValidToken()).data).toEqual({ processPid: 1 });
    expect(stub.requests.every((r) => r.headers.token === 'downstream-token')).toBe(true);
  });

  it('should download files, previews, zips and p7s as streams', async () => {
    expect(await readAll(await connection.downloadFile('f1', {}))).toBe('file-bytes');
    expect(await readAll(await connection.downloadFile('f1', { isP7s: true }))).toBe('p7s-bytes');
    expect(await readAll(await connection.downloadFilePreview('f1'))).toBe('/files/f1/preview');
    expect(await readAll(await connection.downloadZip(['f1', 'f2']))).toBe('/files/f1,f2/zip');
    expect(await readAll(await connection.getP7sSignature('f1', true))).toBe('p7s-bytes');
  });

  it('should download a file without a stream and fail on a bad status', async () => {
    expect(Buffer.from(await connection.downloadFileWithoutStream('f1')).toString()).toBe('file-bytes');
    expect(Buffer.from(await connection.downloadFileWithoutStream('f1', { isP7s: true })).toString()).toBe('p7s-bytes');
    await expect(connection.downloadFileWithoutStream('bad-download')).rejects.toThrow();
  });

  it('should upload from a stream and surface an upstream error', async () => {
    const result = await connection.uploadFileFromStream(Readable.from(['hello']), 'a b.txt', 'desc', 'text/plain', 5);
    expect(result).toMatchObject({ id: 'new-file' });
    expect(stub.requests.some((r) => r.url === '/files?container_id=c1&name=a%20b.txt&description=desc')).toBe(true);

    await expect(connection.uploadFileFromStream(Readable.from(['reject']), 'a.txt')).rejects.toThrow('Rejected.');
  });

  it('should open an upload stream', async () => {
    const upload = await connection.uploadFile('b.txt', '', 'text/plain');
    upload.end('payload');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(stub.requests.some((r) => (r.url || '').startsWith('/files?container_id=c1&name=b.txt'))).toBe(true);
  });

  it('should work with signatures and p7s signatures', async () => {
    expect(await connection.getSignatures('f1')).toEqual([{ id: 's1' }]);
    expect(await connection.addSignature('f1', 'data', 'sig', 'cert')).toEqual({ id: 's2', received: 'f1' });
    expect(await connection.getP7sSignature('f1')).toBe('p7s-base64');
    expect(await connection.addP7sSignature('f1', 'p7s')).toEqual({ id: 'p1' });
    expect(await connection.updateP7sSignature('p1', 'p7s')).toEqual({ id: 'p1', updated: true });
    expect(await connection.removeP7sSignature('p1')).toEqual({ deleted: true });
  });

  it('should copy a file', async () => {
    expect(await connection.copyFile('f1')).toEqual({ id: 'copy-1' });
  });

  it('should generate file names', () => {
    expect(connection.generateFileName('pdf')).toMatch(/^[0-9a-f]{80}\.pdf$/);
    expect(connection.generateFileName()).toMatch(/^[0-9a-f]{80}$/);
    expect(() => connection.generateFileNameForUser('', 'pdf')).toThrow(TypeError);
  });
});
