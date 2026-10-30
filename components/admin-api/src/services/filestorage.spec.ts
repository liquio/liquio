import { FileStorageService } from './filestorage';
import { resetAppContext, setAppContext } from '../lib/context';

describe('services/filestorage', () => {
  const API_HOST = 'http://filestorage.local';
  const TRAVERSAL_ID = '../../admin/secret?x=1#y';
  const ENCODED_ID = '..%2F..%2Fadmin%2Fsecret%3Fx%3D1%23y';

  const mockRequest = jest.fn();
  let service: FileStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    setAppContext({
      httpClient: { request: mockRequest },
      config: { filestorage: { apiHost: API_HOST, token: 'token', containerId: 'container' } },
    });
    (FileStorageService as any).singleton = undefined;
    service = new FileStorageService();
    mockRequest.mockResolvedValue({ body: null, headers: { get: () => null }, json: async () => ({}) });
  });

  afterAll(() => {
    resetAppContext();
  });

  it('keeps regular file ids as is', async () => {
    const options = await service.downloadFileRequestOptions('3f6c26d0-4bf3-11ea-b53a-b9dbc2be6c8d');
    expect(options.url).toBe(`${API_HOST}/files/3f6c26d0-4bf3-11ea-b53a-b9dbc2be6c8d`);
  });

  it('encodes file id in download file request options url', async () => {
    const options = await service.downloadFileRequestOptions(TRAVERSAL_ID);
    expect(options.url).toBe(`${API_HOST}/files/${ENCODED_ID}`);
  });

  it('encodes file id in preview request options url', async () => {
    const options = await service.downloadPreviewRequestOptions(TRAVERSAL_ID);
    expect(options.url).toBe(`${API_HOST}/files/${ENCODED_ID}/preview`);
  });

  it('encodes file id in download p7s request options url', async () => {
    const options = await service.downloadP7sRequestOptions(TRAVERSAL_ID);
    expect(options.url).toBe(`${API_HOST}/files/${ENCODED_ID}/p7s?as_file=false&as_base64=false`);
  });

  it('encodes file id in download p7s url', async () => {
    await service.downloadP7s(TRAVERSAL_ID);
    expect(mockRequest.mock.calls[0][0]).toBe(`${API_HOST}/files/${ENCODED_ID}/p7s?as_file=false&as_base64=false`);
  });

  it('encodes file id in download url', async () => {
    await service.download(TRAVERSAL_ID);
    expect(mockRequest.mock.calls[0][0]).toBe(`${API_HOST}/files/${ENCODED_ID}?as_file=false&as_base64=false`);
  });

  it('encodes file id in find info url', async () => {
    await service.findInfoById(TRAVERSAL_ID).catch(() => undefined);
    expect(mockRequest.mock.calls[0][0]).toBe(`${API_HOST}/files/${ENCODED_ID}/info`);
  });

  it('encodes id in delete p7s url', async () => {
    await service.deleteP7s(TRAVERSAL_ID).catch(() => undefined);
    expect(mockRequest.mock.calls[0][0]).toBe(`${API_HOST}/p7s_signatures/${ENCODED_ID}`);
  });
});
