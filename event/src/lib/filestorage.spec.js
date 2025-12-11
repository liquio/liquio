const debug = require('debug');
const nock = require('nock');

const FileStorage = require('./filestorage');

global.log = {
  save: jest.fn((type, data, level) => debug('test:log')({ type, data, level })),
};

jest.mock('./async_local_storage', () => ({
  getTraceId: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

describe('FileStorage', () => {
  const mockOptions = {
    apiHost: 'http://mock-api-host.com',
    token: 'mock-token',
    containerId: 'mock-container-id',
    getFileTimeout: 1000,
    downloadFileTimeout: 1000,
    getSetSignatureTimeout: 1000,
    createAsicTimeout: 1000,
  };

  global.config = {
    filestorage: mockOptions,
  };

  let fileStorage;

  beforeAll(() => {
    fileStorage = new FileStorage(mockOptions);
  });

  afterEach(() => {
    if (!nock.isDone()) {
      throw new Error(`Not all nocks were used in test "${expect.getState().currentTestName}": ${nock.pendingMocks()}`);
    }
    nock.cleanAll();
  });

  it('should get file info', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .get('/files/mock-file-id/info')
      .matchHeader('token', 'mock-token')
      .reply(200, {
        data: {
          id: fileId,
          name: 'mock-file-name',
          description: 'mock-file-description',
          contentType: 'application/pdf',
          size: 12345,
          mimeType: 'application/pdf',
        },
      });

    const result = await fileStorage.getFileInfo(fileId);

    expect(result).toEqual({
      contentType: 'application/pdf',
      description: 'mock-file-description',
      id: 'mock-file-id',
      mimeType: 'application/pdf',
      name: 'mock-file-name',
      size: 12345,
    });
  });

  it('should form download file request options', async () => {
    const result = await fileStorage.downloadFileRequestOptions('file-id');
    expect(result).toEqual({
      method: 'GET',
      url: 'http://mock-api-host.com/files/file-id',
      headers: {
        token: 'mock-token',
        'x-trace-id': '123e4567-e89b-12d3-a456-426614174000',
      },
      responseType: 'arraybuffer',
      timeout: 1000,
    });
  });

  it('should form download file request options with custom response type', async () => {
    const result = await fileStorage.downloadFileRequestOptions('file-id', 'utf8');
    expect(result).toEqual({
      method: 'GET',
      url: 'http://mock-api-host.com/files/file-id',
      headers: {
        token: 'mock-token',
        'x-trace-id': '123e4567-e89b-12d3-a456-426614174000',
      },
      responseType: 'utf8',
      timeout: 1000,
    });
  });

  it('should download file', async () => {
    const fileId = 'mock-file-id';
    const fileContent = Buffer.from('mock-file-content');

    nock(mockOptions.apiHost).get(`/files/${fileId}`).matchHeader('token', 'mock-token').reply(200, fileContent);

    const result = await fileStorage.downloadFile(fileId);
    expect(result).toEqual(fileContent);
  });

  it('should handle download file error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost).get(`/files/${fileId}`).matchHeader('token', 'mock-token').reply(404, { error: 'File not found' });

    await expect(fileStorage.downloadFile(fileId)).rejects.toThrow('Request failed with status code 404');
  });

  it('should form download file preview request options', async () => {
    const fileId = 'mock-file-id';

    const result = await fileStorage.downloadFilePreviewRequestOptions(fileId);

    expect(result).toEqual({
      method: 'GET',
      url: 'http://mock-api-host.com/files/mock-file-id/preview',
      headers: {
        token: 'mock-token',
        'x-trace-id': '123e4567-e89b-12d3-a456-426614174000',
      },
      timeout: 1000,
    });
  });

  it('should download file preview', async () => {
    const fileId = 'mock-file-id';
    const fileContent = Buffer.from('mock-file-preview-content');

    nock(mockOptions.apiHost).get(`/files/${fileId}/preview`).matchHeader('token', 'mock-token').reply(200, fileContent);

    const result = await fileStorage.downloadFilePreview(fileId);
    expect(Buffer.from(result)).toEqual(fileContent);
  });

  it('should handle download file preview error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost).get(`/files/${fileId}/preview`).matchHeader('token', 'mock-token').reply(404, { error: 'File not found' });

    await expect(fileStorage.downloadFilePreview(fileId)).rejects.toThrow('Request failed with status code 404');
  });

  it('should download zip', async () => {
    const fileIds = ['mock-zip-file-id-1', 'mock-zip-file-id-2'];
    const zipContent = Buffer.from('mock-zip-content');

    nock(mockOptions.apiHost)
      .get(`/files/${fileIds.join(',')}/zip`)
      .matchHeader('token', 'mock-token')
      .reply(200, zipContent);

    const result = await fileStorage.downloadZip(fileIds);
    expect(Buffer.from(result)).toEqual(zipContent);
  });

  it('should handle download zip error', async () => {
    const fileIds = ['mock-zip-file-id-1', 'mock-zip-file-id-2'];

    nock(mockOptions.apiHost)
      .get(`/files/${fileIds.join(',')}/zip`)
      .matchHeader('token', 'mock-token')
      .reply(404, { error: 'Zip not found' });

    await expect(fileStorage.downloadZip(fileIds)).rejects.toThrow('Request failed with status code 404');
  });

  it('should form upload file request options', async () => {
    const fileName = 'mock-file-name';
    const fileDescription = 'mock-file-description';
    const contentType = 'application/pdf';
    const contentLength = 12345;

    const result = await fileStorage.uploadFileRequestOptions(fileName, fileDescription, contentType, contentLength);

    expect(result).toEqual({
      method: 'POST',
      url: `http://mock-api-host.com/files?container_id=mock-container-id&name=${encodeURIComponent(fileName)}&description=${encodeURIComponent(
        fileDescription,
      )}&is_set_extension=false&with_preview=false`,
      headers: {
        'x-trace-id': '123e4567-e89b-12d3-a456-426614174000',
        token: 'mock-token',
        'Content-Type': 'application/pdf',
        'Content-Length': 12345,
      },
      timeout: 1000,
    });
  });

  // TODO: handle streaming upload and nock matching
  xit('should upload a file', async () => {
    const fileName = 'mock-file-name';
    const fileDescription = 'mock-file-description';
    const contentType = 'application/pdf';
    const contentLength = 12345;

    nock(mockOptions.apiHost)
      .post('/files')
      .matchHeader('Content-Type', contentType)
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .matchHeader('token', 'mock-token')
      .matchHeader('Content-Length', contentLength.toString())
      .reply(200, {
        id: 'mock-file-id',
        name: fileName,
        description: fileDescription,
        contentType,
        contentLength,
      });

    const result = await fileStorage.uploadFile(fileName, fileDescription, contentType, contentLength);

    expect(result).toEqual({
      contentType,
      contentLength,
      description: fileDescription,
      id: 'mock-file-id',
      name: fileName,
    });
  });

  it('should get signatures', async () => {
    const fileId = 'mock-file-id';
    const signatureId = 'mock-signature-id';

    nock(mockOptions.apiHost)
      .get(`/signatures?file_id=${fileId}&limit=1000`)
      .matchHeader('token', 'mock-token')
      .reply(200, {
        data: {
          id: signatureId,
          fileId,
          status: 'signed',
          createdAt: '2023-01-01T00:00:00Z',
        },
      });

    const result = await fileStorage.getSignatures(fileId);

    expect(result).toEqual({
      id: signatureId,
      fileId,
      status: 'signed',
      createdAt: '2023-01-01T00:00:00Z',
    });
  });

  it('should add signature', async () => {
    const fileId = 'mock-file-id';
    const signedData = 'mock-signed-data';
    const signature = 'mock-signature';
    const certificate = 'mock-certificate';

    nock(mockOptions.apiHost)
      .post('/signatures', {
        fileId,
        signedData,
        signature,
        certificate,
      })
      .matchHeader('Content-Type', 'application/json')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .matchHeader('token', 'mock-token')
      .reply(200, {
        data: {
          id: 'mock-signature-id',
          fileId,
          signedData,
          signature,
          certificate,
          createdAt: '2023-01-01T00:00:00Z',
        },
      });

    const result = await fileStorage.addSignature(fileId, signedData, signature, certificate);

    expect(result).toEqual({
      certificate: 'mock-certificate',
      createdAt: '2023-01-01T00:00:00Z',
      fileId: 'mock-file-id',
      id: 'mock-signature-id',
      signature: 'mock-signature',
      signedData: 'mock-signed-data',
    });
  });

  it('should get P7S signature as file', async () => {
    const fileId = 'mock-file-id';
    const p7sContent = Buffer.from('mock-p7s-content');

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/p7s?as_file=true`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, p7sContent);

    const result = await fileStorage.getP7sSignature(fileId, true);
    const chunks = [];
    for await (const chunk of result) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    expect(buffer).toEqual(p7sContent);
  });

  it('should get P7S signature as Base64', async () => {
    const fileId = 'mock-file-id';
    const p7sBase64 = 'mock-p7s-base64';

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/p7s?as_file=true&as_base64=true`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, p7sBase64);

    const result = await fileStorage.getP7sSignature(fileId, true, true);
    const chunks = [];
    for await (const chunk of result) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks).toString();
    expect(buffer).toEqual(p7sBase64);
  });

  it('should handle get P7S signature error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/p7s?as_file=true`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'P7S signature not found' });

    await expect(fileStorage.getP7sSignature(fileId, true)).rejects.toThrow('Request failed with status code 404');
  });

  it('should add P7S signature', async () => {
    const fileId = 'mock-file-id';
    const p7sBase64 = 'mock-p7s-base64';

    nock(mockOptions.apiHost)
      .post('/p7s_signatures', { fileId, p7s: p7sBase64 })
      .matchHeader('Content-Type', 'application/json')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .matchHeader('token', 'mock-token')
      .reply(200, {
        data: {
          id: 'mock-p7s-id',
          fileId,
          p7s: p7sBase64,
          createdAt: '2023-01-01T00:00:00Z',
        },
      });

    const result = await fileStorage.addP7sSignature(fileId, p7sBase64);

    expect(result).toEqual({
      id: 'mock-p7s-id',
      fileId: 'mock-file-id',
      p7s: 'mock-p7s-base64',
      createdAt: '2023-01-01T00:00:00Z',
    });
  });

  it('should update P7S signature', async () => {
    const p7sId = 'mock-p7s-id';
    const p7sBase64 = 'updated-mock-p7s-base64';

    nock(mockOptions.apiHost)
      .put(`/p7s_signatures/${p7sId}`, { p7s: p7sBase64 })
      .matchHeader('Content-Type', 'application/json')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .matchHeader('token', 'mock-token')
      .reply(200, {
        data: {
          id: p7sId,
          p7s: p7sBase64,
          updatedAt: '2023-01-01T00:00:00Z',
        },
      });

    const result = await fileStorage.updateP7sSignature(p7sId, p7sBase64);

    expect(result).toEqual({
      id: 'mock-p7s-id',
      p7s: 'updated-mock-p7s-base64',
      updatedAt: '2023-01-01T00:00:00Z',
    });
  });

  it('should delete a file', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/files/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, { success: true });

    await expect(fileStorage.deleteFile(fileId)).resolves.toBeUndefined();
  });

  it('should handle delete file error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/files/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'File not found' });

    await expect(fileStorage.deleteFile(fileId)).rejects.toThrow('{"error":"File not found"}');
  });

  it('should delete signature by file ID', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/signatures/file/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, { success: true });

    await expect(fileStorage.deleteSignatureByFileId(fileId)).resolves.toBeUndefined();
  });

  it('should handle delete signature by file ID error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/signatures/file/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'Signature not found' });

    await expect(fileStorage.deleteSignatureByFileId(fileId)).rejects.toThrow('{"error":"Signature not found"}');
  });

  it('should delete P7S signature by file ID', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/p7s_signatures/file/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, { success: true });

    await expect(fileStorage.deleteP7sSignatureByFileId(fileId)).resolves.toBeUndefined();
  });

  it('should handle delete P7S signature by file ID error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .delete(`/p7s_signatures/file/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'P7S signature not found' });

    await expect(fileStorage.deleteP7sSignatureByFileId(fileId)).rejects.toThrow('{"error":"P7S signature not found"}');
  });

  it('should copy a file', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .post(`/files/${fileId}/copy`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, {
        data: {
          id: 'copied-file-id',
          name: 'copied-file-name',
          description: 'copied-file-description',
          contentType: 'application/pdf',
          size: 12345,
          mimeType: 'application/pdf',
        },
      });

    const result = await fileStorage.copyFile(fileId);

    expect(result).toEqual({
      id: 'copied-file-id',
      name: 'copied-file-name',
      description: 'copied-file-description',
      contentType: 'application/pdf',
      size: 12345,
      mimeType: 'application/pdf',
    });
  });

  it('should handle copy file error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .post(`/files/${fileId}/copy`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'File not found' });

    await expect(fileStorage.copyFile(fileId)).rejects.toThrow('{"error":"File not found"}');
  });

  it('should create ASIC manifest', async () => {
    const filesIds = ['file-id-1', 'file-id-2'];
    const manifestContent = {
      id: 'manifest-id',
      name: 'manifest-name',
      description: 'manifest-description',
      contentType: 'application/xml',
      size: 1234,
    };

    nock(mockOptions.apiHost)
      .post('/files/asicmanifest', { filesIds }) // Corrected the endpoint path
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, {
        data: manifestContent,
      });

    const result = await fileStorage.createAsicManifest(filesIds);

    expect(result).toEqual(manifestContent);
  });

  it('should handle create ASIC manifest error', async () => {
    const filesIds = ['file-id-1', 'file-id-2'];

    nock(mockOptions.apiHost)
      .post('/files/asicmanifest', { filesIds })
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(400, { error: 'Invalid request' });

    await expect(fileStorage.createAsicManifest(filesIds)).rejects.toThrow('{"error":"Invalid request"}');
  });

  it('should create ASIC', async () => {
    const manifestFileId = 'mock-manifest-file-id';
    const filesIds = ['file-id-1', 'file-id-2'];
    const asicContent = Buffer.from('mock-asic-content');

    nock(mockOptions.apiHost)
      .post('/files/asic', { manifestFileId, filesIds })
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, asicContent);

    const result = await fileStorage.createAsic(manifestFileId, filesIds);
    const chunks = [];
    for await (const chunk of result) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    expect(buffer).toEqual(asicContent);
  });

  it('should handle create ASIC error', async () => {
    const manifestFileId = 'mock-manifest-file-id';
    const filesIds = ['file-id-1', 'file-id-2'];

    nock(mockOptions.apiHost)
      .post('/files/asic', { manifestFileId, filesIds })
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(400, { error: 'Invalid request' });

    await expect(fileStorage.createAsic(manifestFileId, filesIds)).rejects.toThrow('Request failed with status code 400');
  });

  it('should generate a file name without extension', () => {
    const result = fileStorage.generateFileName();
    expect(result).toMatch(/^[a-f0-9]{80}$/);
  });

  it('should generate a file name with extension', () => {
    const extension = 'pdf';
    const result = fileStorage.generateFileName(extension);
    expect(result).toMatch(new RegExp(`^[a-f0-9]{80}\\.${extension}$`));
  });

  xit('should generate a file name for a user without extension', () => {
    const userId = 'mock-user-id';
    const result = fileStorage.generateFileNameForUser(userId);
    expect(result).toMatch(new RegExp(`^${userId}-[a-f0-9]{80}$`));
  });

  xit('should generate a file name for a user with extension', () => {
    const userId = 'mock-user-id';
    const extension = 'png';
    const result = fileStorage.generateFileNameForUser(userId, extension);
    expect(result).toMatch(new RegExp(`^${userId}-[a-f0-9]{80}\\.${extension}$`));
  });

  it('should send a ping request', async () => {
    nock(mockOptions.apiHost)
      .get('/test/ping_with_auth')
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(
        200,
        {
          data: { success: true },
        },
        {
          version: '1.0.0',
          customer: 'mock-customer',
          environment: 'mock-environment',
        },
      );

    const result = await fileStorage.sendPingRequest();

    expect(result).toEqual({
      version: '1.0.0',
      customer: 'mock-customer',
      environment: 'mock-environment',
      body: { success: true },
    });
  });

  it('should get file with base64 content without signature', async () => {
    const fileId = 'mock-file-id';
    const fileContent = Buffer.from('mock-file-content').toString('base64');

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/info`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, {
        data: {
          name: 'mock-file-name',
          description: 'mock-file-description',
          contentType: 'application/pdf',
          fileContent,
        },
      });

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, Buffer.from('mock-file-content'));

    const result = await fileStorage.getFile(fileId);

    expect(result).toEqual({
      fileId: 'mock-file-id',
      name: 'mock-file-name',
      description: 'mock-file-description',
      contentType: 'application/pdf',
      fileContent,
    });
  });

  it('should get file with base64 content with signature', async () => {
    const fileId = 'mock-file-id';
    const fileContent = Buffer.from('mock-file-content').toString('base64');
    const signatureContent = Buffer.from('mock-signature-content').toString('base64');

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/info`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, {
        data: {
          name: 'mock-file-name',
          description: 'mock-file-description',
          contentType: 'application/pdf',
          fileContent,
        },
      });

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/p7s`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(200, { data: { p7s: signatureContent } });

    const result = await fileStorage.getFile(fileId, true);

    expect(result).toEqual({
      fileId: 'mock-file-id',
      name: 'mock-file-name.p7s',
      description: 'mock-file-description',
      contentType: 'application/pdf',
      fileContent: 'bW9jay1zaWduYXR1cmUtY29udGVudA==',
    });
  });

  it('should handle get file error', async () => {
    const fileId = 'mock-file-id';

    nock(mockOptions.apiHost)
      .get(`/files/${fileId}/info`)
      .matchHeader('token', 'mock-token')
      .matchHeader('x-trace-id', '123e4567-e89b-12d3-a456-426614174000')
      .reply(404, { error: 'File info not found' });

    await expect(fileStorage.getFile(fileId)).rejects.toThrow('{"error":"File info not found"}');
  });
});
