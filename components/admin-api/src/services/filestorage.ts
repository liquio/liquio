import { ReadableData } from '../types/readable_data';
import { getConfig, getHttpClient } from '../lib/context';

/**
 * File storage service.
 */
export class FileStorageService {
  private static singleton: FileStorageService;

  public apiHost: string;
  public token: string;
  public containerId: string;

  constructor() {
    if (!FileStorageService.singleton) {
      this.apiHost = getConfig().filestorage.apiHost;
      this.token = getConfig().filestorage.token;
      this.containerId = getConfig().filestorage.containerId;
      FileStorageService.singleton = this;
    }

    return FileStorageService.singleton;
  }

  /**
   * Download file request options.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  async downloadFileRequestOptions(id) {
    const requestOptions = {
      url: `${this.apiHost}/files/${encodeURIComponent(id)}`,
      method: 'GET',
      headers: {
        token: this.token,
      },
    };

    return requestOptions;
  }

  /**
   * Download preview request options.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  async downloadPreviewRequestOptions(id) {
    return {
      url: `${this.apiHost}/files/${encodeURIComponent(id)}/preview`,
      method: 'GET',
      headers: {
        token: this.token,
      },
    };
  }

  /**
   * Find file metadata by ID.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  async findInfoById(id) {
    const response = await getHttpClient().request(
      `${this.apiHost}/files/${encodeURIComponent(id)}/info`,
      {
        method: 'GET',
        headers: {
          token: this.token,
        },
      },
      'filestorage-find-info-by-id',
    );

    return response.json();
  }

  /**
   * Upload file.
   * @param {object} params Upload params.
   * @returns {Promise<object>}
   */
  async upload({ name, contentType, contentLength, content, withPreview = true, meta = {} }: any) {
    const query = new URLSearchParams({
      name,
      container_id: String(this.containerId),
      with_preview: withPreview ? 'true' : 'false',
      meta: Buffer.from(JSON.stringify(meta), 'utf8').toString('base64'),
    });

    const response = await getHttpClient().request(
      `${this.apiHost}/files?${query.toString()}`,
      {
        method: 'POST',
        headers: {
          token: this.token,
          'content-type': contentType || 'application/octet-stream',
          'content-length': String(contentLength || content.length),
        },
        body: content,
      },
      'filestorage-upload-file',
    );

    return response.json();
  }

  /**
   * Download p7s request options.
   * @param {string} id ID.
   * @param {boolean} [asFile] Get as file indicator.
   * @param {boolean} [asBase64] Get as Base64 indicator.
   * @returns {Promise<object>}
   */
  async downloadP7sRequestOptions(id, asFile = false, asBase64 = false) {
    const requestOptions = {
      url: `${this.apiHost}/files/${encodeURIComponent(id)}/p7s?as_file=${asFile}&as_base64=${asBase64}`,
      method: 'GET',
      headers: {
        token: this.token,
      },
    };

    return requestOptions;
  }

  /**
   * Download p7s.
   * @param {string} id ID.
   * @param {boolean} [asFile] Get as file indicator.
   * @param {boolean} [asBase64] Get as Base64 indicator.
   * @returns {Promise<ReadableData>}
   */
  async downloadP7s(id, asFile = false, asBase64 = false) {
    const response = await getHttpClient().request(
      `${this.apiHost}/files/${encodeURIComponent(id)}/p7s?as_file=${asFile}&as_base64=${asBase64}`,
      {
        method: 'GET',
        headers: {
          token: this.token,
        },
      },
      'filestorage-download-p7s',
    );

    return new ReadableData({
      readableStream: response.body,
      dataType: response.headers.get('content-type'),
      dataLength: response.headers.get('content-length'),
    });
  }

  /**
   * Download file.
   * @param {string} id ID.
   * @param {boolean} [asFile] Get as file indicator.
   * @param {boolean} [asBase64] Get as Base64 indicator.
   * @returns {Promise<ReadableData>}
   */
  async download(id, asFile = false, asBase64 = false) {
    const response = await getHttpClient().request(
      `${this.apiHost}/files/${encodeURIComponent(id)}?as_file=${asFile}&as_base64=${asBase64}`,
      {
        method: 'GET',
        headers: {
          token: this.token,
        },
      },
      'filestorage-download-p7s',
    );

    return new ReadableData({
      readableStream: response.body,
      dataType: response.headers.get('content-type'),
      dataLength: response.headers.get('content-length'),
    });
  }

  /**
   * Delete p7s.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */

  async deleteP7s(id) {
    const response = await getHttpClient().request(
      `${this.apiHost}/p7s_signatures/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          token: this.token,
        },
      },
      'filestorage-delete-p7s',
    );
    return response;
  }
}
