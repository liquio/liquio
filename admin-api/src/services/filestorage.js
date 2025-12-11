const ReadableData = require('../types/readable_data');

/**
 * File storage service.
 */
class FileStorageService {
  constructor() {
    if (!FileStorageService.singleton) {
      this.apiHost = config.filestorage.apiHost;
      this.token = config.filestorage.token;
      this.containerId = config.filestorage.containerId;
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
      url: `${this.apiHost}/files/${id}`,
      method: 'GET',
      headers: {
        token: this.token,
      },
    };

    return requestOptions;
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
      url: `${this.apiHost}/files/${id}/p7s?as_file=${asFile}&as_base64=${asBase64}`,
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
  async download(id, asFile = false, asBase64 = false) {
    const response = await global.httpClient.request(
      `${this.apiHost}/files/${id}?as_file=${asFile}&as_base64=${asBase64}`,
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
    const response = await global.httpClient.request(
      `${this.apiHost}/p7s_signatures/${id}`,
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

module.exports = FileStorageService;
