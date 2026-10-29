import { Readable } from 'node:stream';

import nock from 'nock';

import { FileStorage } from '../src/lib/filestorage';
import { TestApp } from './test-app';

const HOST = 'http://fs.test';

describe('Group D - filestorage', () => {
  let app: TestApp;
  let fs: FileStorage;
  const auth = { reqheaders: { token: 'fs-token' } };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    FileStorage.singleton = undefined as any;
    fs = new FileStorage({ apiHost: HOST, token: 'fs-token', containerId: 'cont-1' });
  });
  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    FileStorage.singleton = undefined as any;
    await TestApp.afterAll(app);
  });
  afterEach(() => nock.cleanAll());

  it('is a singleton with default timeouts', () => {
    expect(new FileStorage({ apiHost: 'http://x' })).toBe(fs);
    expect(fs.getFileTimeout).toBe(60000);
    expect(fs.downloadFileTimeout).toBe(60000);
    expect(fs.getSetSignatureTimeout).toBe(40000);
    expect(fs.createAsicTimeout).toBe(60000);
    expect(fs.containerId).toBe('cont-1');
  });

  it('getFileInfo', async () => {
    nock(HOST, auth)
      .get('/files/F1/info')
      .reply(200, { data: { id: 'F1', name: 'a.txt' } });
    expect(await fs.getFileInfo('F1')).toEqual({ id: 'F1', name: 'a.txt' });
  });

  it('download options and downloadFile', async () => {
    const o = await fs.downloadFileRequestOptions('F1');
    expect(o.url).toBe(`${HOST}/files/F1`);
    expect(o.responseType).toBe('arraybuffer');
    expect(o.headers.token).toBe('fs-token');
    expect((await fs.downloadFileRequestOptions('F1', 'stream')).responseType).toBe('stream');
    nock(HOST, auth).get('/files/F1').times(2).reply(200, 'content');
    expect(Buffer.from(await fs.downloadFile('F1')).toString()).toBe('content');
    expect((await fs.downloadFileWithoutStream('F1')).toString()).toBe('content');
  });

  it('downloadFileWithoutStream logs and rethrows errors', async () => {
    const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
    nock(HOST).get('/files/F2').reply(404, 'nf');
    await expect(fs.downloadFileWithoutStream('F2', true)).rejects.toThrow('Request failed with status code 404');
    expect(save.mock.calls.some((c) => c[0] === 'filestorage-download-file-without-stream|error' && c[2] === 'error')).toBe(true);
    save.mockRestore();
  });

  it('downloadFileWithoutStream with check passes on 200', async () => {
    nock(HOST).get('/files/F3').reply(200, 'ok');
    expect((await fs.downloadFileWithoutStream('F3', true)).toString()).toBe('ok');
  });

  it('preview and zip', async () => {
    expect((await fs.downloadFilePreviewRequestOptions('F1')).url).toBe(`${HOST}/files/F1/preview`);
    expect((await fs.downloadZipRequestOptions(['A', 'B'])).url).toBe(`${HOST}/files/A,B/zip`);
    nock(HOST, auth).get('/files/F1/preview').reply(200, 'prev');
    nock(HOST, auth).get('/files/A,B/zip').reply(200, 'zipdata');
    expect(await fs.downloadFilePreview('F1')).toBe('prev');
    expect(await fs.downloadZip(['A', 'B'])).toBe('zipdata');
  });

  it('uploadFileRequestOptions builds url and headers', async () => {
    const o = await fs.uploadFileRequestOptions('my file.txt', 'des c', 'text/plain', 5, true);
    expect(o.url).toBe(`${HOST}/files?container_id=cont-1&name=my%20file.txt&description=des%20c&is_set_extension=true&with_preview=false`);
    expect(o.headers['Content-Type']).toBe('text/plain');
    expect(o.headers['Content-Length']).toBe(5);
    const o2 = await fs.uploadFileRequestOptions('n');
    expect(o2.url).toBe(`${HOST}/files?container_id=cont-1&name=n&is_set_extension=false&with_preview=false`);
    expect(o2.headers['Content-Type']).toBeUndefined();
    expect(o2.headers['Content-Length']).toBeUndefined();
  });

  it('uploadFile posts and returns data', async () => {
    nock(HOST, auth)
      .post('/files')
      .query(true)
      .reply(200, { data: { id: 'N1' } });
    expect(await fs.uploadFile('n.txt', 'd', 'text/plain', 0)).toEqual({ data: { id: 'N1' } });
  });

  it('uploadFileFromStream returns data, throws on body error, logs request errors', async () => {
    nock(HOST, auth)
      .post('/files', 'payload')
      .query({ name: 'n.txt' })
      .reply(200, { data: { id: 'N2' } });
    const q = { container_id: 'cont-1', name: 'n.txt', is_set_extension: 'false', with_preview: 'false' };
    nock.cleanAll();
    nock(HOST, auth)
      .post('/files', 'payload')
      .query(q)
      .reply(200, { data: { id: 'N2' } });
    expect(await fs.uploadFileFromStream(Readable.from(['payload']), 'n.txt')).toEqual({ id: 'N2' });

    nock(HOST)
      .post('/files')
      .query(true)
      .reply(200, { error: { message: 'quota' } });
    await expect(fs.uploadFileFromStream(Readable.from(['x']), 'n.txt')).rejects.toThrow('quota');
    nock(HOST).post('/files').query(true).reply(200, { error: 'plain' });
    await expect(fs.uploadFileFromStream(Readable.from(['x']), 'n.txt')).rejects.toThrow('plain');

    const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
    nock(HOST).post('/files').query(true).reply(500, {});
    await expect(fs.uploadFileFromStream(Readable.from(['x']), 'n.txt', 'd', 'text/plain', 1, true)).rejects.toThrow(
      'Request failed with status code 500',
    );
    expect(save.mock.calls.some((c) => c[0] === 'filestorage-upload-from-stream-error')).toBe(true);
    save.mockRestore();
  });

  it('getSignatures and addSignature', async () => {
    nock(HOST, auth)
      .get('/signatures')
      .query({ file_id: 'F1', limit: '1000' })
      .reply(200, { data: [{ id: 's1' }] });
    expect(await fs.getSignatures('F1')).toEqual([{ id: 's1' }]);
    nock(HOST, auth)
      .post('/signatures', { fileId: 'F1', signedData: 'sd', signature: 'sg', certificate: 'ce' })
      .reply(200, { data: { id: 's2' } });
    expect(await fs.addSignature('F1', 'sd', 'sg', 'ce')).toEqual({ id: 's2' });
  });

  it('p7s options', async () => {
    expect((await fs.getP7sSignatureRequestOptions('F1')).url).toBe(`${HOST}/files/F1/p7s`);
    const o = await fs.getP7sSignatureRequestOptions('F1', true, true);
    expect(o.url).toBe(`${HOST}/files/F1/p7s?as_file=true&as_base64=true`);
    expect(o.responseType).toBe('stream');
    expect((await fs.getP7sSignatureRequestOptions('F1', true)).url).toBe(`${HOST}/files/F1/p7s?as_file=true`);
    expect((await fs.getP7sSignatureRequestOptions('F1', false, true)).url).toBe(`${HOST}/files/F1/p7s`);
  });

  it('getP7sSignature as json and as file', async () => {
    nock(HOST, auth)
      .get('/files/F1/p7s')
      .reply(200, { data: { p7s: 'P7S' } });
    expect(await fs.getP7sSignature('F1')).toEqual({ p7s: 'P7S' });
    nock(HOST, auth).get('/files/F1/p7s').query({ as_file: 'true' }).reply(200, 'rawp7s');
    const stream = await fs.getP7sSignature('F1', true);
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).toBe('rawp7s');
  });

  it('getP7sSignature does not log the p7s body', async () => {
    const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
    nock(HOST)
      .get('/files/F9/p7s')
      .reply(200, { data: { p7s: 'SECRETP7S' } });
    await fs.getP7sSignature('F9');
    expect(JSON.stringify(save.mock.calls)).not.toContain('SECRETP7S');
    save.mockRestore();
  });

  it('addP7sSignature and updateP7sSignature', async () => {
    nock(HOST, auth)
      .post('/p7s_signatures', { fileId: 'F1', p7s: 'P' })
      .reply(200, { data: { id: 'p1' } });
    expect(await fs.addP7sSignature('F1', 'P')).toEqual({ id: 'p1' });
    nock(HOST, auth)
      .put('/p7s_signatures/p1', { p7s: 'P2' })
      .reply(200, { data: { id: 'p1', p7s: 'P2' } });
    expect(await fs.updateP7sSignature('p1', 'P2')).toEqual({ id: 'p1', p7s: 'P2' });
  });

  it('deletes', async () => {
    nock(HOST, auth)
      .delete('/files/F1')
      .reply(200, { data: { deleted: 1 } });
    nock(HOST, auth)
      .delete('/signatures/file/F1')
      .reply(200, { data: { deleted: 2 } });
    nock(HOST, auth)
      .delete('/p7s_signatures/file/F1')
      .reply(200, { data: { deleted: 3 } });
    expect(await fs.deleteFile('F1')).toEqual({ deleted: 1 });
    expect(await fs.deleteSignatureByFileId('F1')).toEqual({ deleted: 2 });
    expect(await fs.deleteP7sSignatureByFileId('F1')).toEqual({ deleted: 3 });
  });

  it('copyFile', async () => {
    nock(HOST, auth)
      .post('/files/F1/copy')
      .reply(200, { data: { id: 'F1c' } });
    expect(await fs.copyFile('F1')).toEqual({ id: 'F1c' });
  });

  it('asic manifest and asic', async () => {
    nock(HOST, auth)
      .post('/files/asicmanifest', { filesIds: ['A', 'B'] })
      .reply(200, { data: { id: 'M1' } });
    expect(await fs.createAsicManifest(['A', 'B'])).toEqual({ id: 'M1' });
    nock(HOST, auth)
      .post('/files/asicmanifest', { filesIds: [] })
      .reply(200, { data: { id: 'M0' } });
    expect(await fs.createAsicManifest()).toEqual({ id: 'M0' });
    const o = await fs.createAsicRequestOptions('M1', ['A']);
    expect(o.data).toEqual({ manifestFileId: 'M1', filesIds: ['A'] });
    nock(HOST, auth)
      .post('/files/asic', { manifestFileId: 'M1', filesIds: ['A'] })
      .reply(200, 'asicbytes');
    expect(await fs.createAsic('M1', ['A'])).toBe('asicbytes');
  });

  it('generates file names', () => {
    const n = fs.generateFileName();
    expect(n).toMatch(/^[0-9a-f]{80}$/);
    expect(fs.generateFileName('pdf')).toMatch(/^[0-9a-f]{80}\.pdf$/);
    expect(() => fs.generateFileNameForUser('', 'pdf')).toThrow('Incorrect user ID.');
    expect(() => fs.generateFileNameForUser(5 as any)).toThrow(TypeError);
    // getFileNameForUserSuffix is not defined on the class.
    expect(() => fs.generateFileNameForUser('u1')).toThrow(/getFileNameForUserSuffix is not a function/);
  });

  it('sendPingRequest returns headers and body, swallows errors', async () => {
    nock(HOST, auth)
      .get('/test/ping_with_auth')
      .reply(200, { data: { ok: true } }, { version: '2', customer: 'c', environment: 'e' });
    expect(await fs.sendPingRequest()).toEqual({ version: '2', customer: 'c', environment: 'e', body: { ok: true } });
    nock(HOST).get('/test/ping_with_auth').reply(500, {});
    expect(await fs.sendPingRequest()).toBeUndefined();
  });

  it('getFile as base64 content and as p7s', async () => {
    nock(HOST)
      .get('/files/F1/info')
      .times(2)
      .reply(200, { data: { name: 'a.txt', description: 'dd', contentType: 'text/plain' } });
    nock(HOST).get('/files/F1').reply(200, 'hello');
    expect(await fs.getFile('F1')).toEqual({
      fileId: 'F1',
      name: 'a.txt',
      description: 'dd',
      contentType: 'text/plain',
      fileContent: Buffer.from('hello').toString('base64'),
    });
    nock(HOST)
      .get('/files/F1/p7s')
      .query(true)
      .reply(200, { data: { p7s: 'P7SDATA' } });
    expect(await fs.getFile('F1', true)).toEqual({
      fileId: 'F1',
      name: 'a.txt.p7s',
      description: 'dd',
      contentType: 'text/plain',
      fileContent: 'P7SDATA',
    });
  });
});
