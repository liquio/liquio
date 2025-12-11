const axios = require('axios');

const Provider = require('../provider');
const Auth = require('./auth');
const HttpRequest = require('../../lib/http_request');

const PROVIDER_NAME = 'minio';
const DEFAULT_ROUTES = {
  getTokens: '/v3/auth/tokens',
};
const DEFAULT_AUTH_VERSION = 3;
const DEFAULT_CONTAINER = 'dev';
const CONTAINER_BYTES_USED_HEADER = 'x-container-bytes-used';
const CONTAINER_OBJECT_COUNT_HEADER = 'x-container-object-count';
const BYTES_IN_GIGABYTES = 1000000000;
const AUTH_CACHE_TTL = 30000;

/**
 * Minio.
 */
class Minio extends Provider {
  /**
   * Minio constructor.
   * @param {object} minioConfig Minio config.
   */
  constructor(minioConfig) {
    // Define singleton.
    if (!Minio.singleton) {
      super();
      this.config = minioConfig;
      this.server = minioConfig.server;
      this.bucket = minioConfig.bucket;
      this.authVersion = minioConfig.authVersion || DEFAULT_AUTH_VERSION;
      this.routes = { ...DEFAULT_ROUTES, ...minioConfig.routes };
      this.timeout = minioConfig.timeout;
      this.tenantName = minioConfig.tenantName;
      this.account = minioConfig.account;
      this.container = minioConfig.container || DEFAULT_CONTAINER;
      this.authCacheTtl = minioConfig.authCacheTtl || AUTH_CACHE_TTL;
      this.auth = new Auth(this);
      Minio.singleton = this;
    }
    return Minio.singleton;
  }

  /**
   * Provider name.
   * @returns {PROVIDER_NAME} Files provider name.
   */
  static get ProviderName() {
    return PROVIDER_NAME;
  }

  /**
   * Get info to handle file.
   * @param {string} filePath File path.
   * @param {string} contentType File content type.
   * @returns {Promise<{url: string, headers: object}>} Info to download file.
   */
  async getInfoToHandleFile({ filePath, contentType, method } = {}) {
    // Get tenant auth info.
    const { authorization, date } = this.auth.getAuthInfo({ filePath, contentType, method });

    const url = `${this.server}/${this.bucket}/${filePath}`;
    const headers = {
      Date: date,
      'Content-Type': contentType,
      Authorization: authorization,
    };

    return { url, headers };
  }

  /**
   * Download file request options.
   * @protected
   * @param {string} filePath File path.
   * @returns {Promise<object>} Request options.
   */
  async downloadFileRequestOptions({ filePath, contentType }) {
    // Get info to handle file.
    !global.silentUpload && log.save('minio-file-downloading', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile({ filePath, contentType, method: HttpRequest.Methods.GET });
    const { url, headers } = infoToHandleFile;

    // Get and return request options.
    !global.silentUpload &&
      log.save('minio-file-downloading|request-options', {
        url,
        headers,
        method: HttpRequest.Methods.GET,
        timeout: this.timeout,
      });
    
    return { url, headers, method: HttpRequest.Methods.GET, timeout: this.timeout };
  }

  /**
   * Download file.
   * @param {string} filePath File path.
   * @returns {Promise<ReadableStream>} Readable stream to download file.
   */
  async downloadFile(filePath) {
    // Define request options.
    const requestOptions = await this.downloadFileRequestOptions({ filePath });

    // Configure axios request with streaming
    const axiosConfig = {
      method: requestOptions.method.toLowerCase(),
      url: requestOptions.url,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      responseType: 'stream',
    };

    // Return downloading stream.
    const response = await axios(axiosConfig);
    return response.data;
  }

  /**
   * Download file as buffer.
   * @param {string} filePath File path.
   * @returns {Promise<Buffer>} File buffer.
   */
  async downloadFileAsBuffer(filePath, { contentType } = {}) {
    // Define request options.
    const requestOptions = await this.downloadFileRequestOptions({ filePath, contentType });

    // Configure axios request for buffer response
    const axiosConfig = {
      method: requestOptions.method.toLowerCase(),
      url: requestOptions.url,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      responseType: 'arraybuffer',
    };

    // Return downloading buffer.
    const response = await axios(axiosConfig);
    return Buffer.from(response.data);
  }

  /**
   * Upload file request options.
   * @protected
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<WritableStream>} Writable stream to upload file.
   */
  async uploadFileRequestOptions(filePath, contentType, fileContent) {
    // Get info to handle file.
    !global.silentUpload && log.save('minio-file-uploading', { filePath, contentType });
    const { url, headers } = await this.getInfoToHandleFile({ filePath, contentType, method: HttpRequest.Methods.PUT });
    // headers['Content-Type'] = contentType;
    const body = fileContent;

    // Get and return request options.
    !global.silentUpload &&
      log.save('minio-file-uploading|request-options', {
        url,
        headers,
        method: HttpRequest.Methods.PUT,
        body: '***',
        timeout: this.timeout,
      });

    return { url, headers, method: HttpRequest.Methods.PUT, body, timeout: this.timeout };
  }

  /**
   * Upload file.
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<{fileLink, hash}>} Promise of file info.
   */
  async uploadFile(filePath, contentType, fileContent) {
    // Define request options.
    const requestOptions = await this.uploadFileRequestOptions(filePath, contentType, fileContent);

    try {
      // Configure axios request
      const axiosConfig = {
        method: requestOptions.method.toLowerCase(),
        url: requestOptions.url,
        headers: requestOptions.headers,
        data: requestOptions.body,
        timeout: requestOptions.timeout,
        validateStatus: (status) => status === 200,
      };

      // Make the request
      const response = await axios(axiosConfig);

      // Check responsed body.
      const requestOptionsToLog = { ...requestOptions, body: '***' };
      !global.silentUpload &&
        log.save('minio-uploading-file-response', {
          requestOptions: requestOptionsToLog,
          filePath,
          body: response.data,
          headers: response.headers,
        });

      // Return uploaded file info.
      const fileLink = filePath;
      const hash = response.headers && response.headers.etag;
      const uploadedFileInfo = { fileLink, hash };
      return uploadedFileInfo;
    } catch (error) {
      // Handle error.
      !global.silentUpload && log.save('minio-uploading-error', { error: error.message, filePath });
      throw error;
    }
  }

  /**
   * Delete file.
   * @param {string} filePath File path.
   * @param {string} [containerName] Container name.
   * @returns {Promise<any>} Deleting result.
   */
  async deleteFile(filePath, containerName = this.container) {
    // Get info to handle file.
    !global.silentUpload && log.save('minio-file-deleting', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile({ filePath, containerName, method: HttpRequest.Methods.DELETE });
    const { url, headers } = infoToHandleFile;

    // Delete file.
    const deletingResult = await HttpRequest.send({ url, headers, method: HttpRequest.Methods.DELETE, timeout: this.timeout });
    !global.silentUpload && log.save('minio-file-deleting-result', deletingResult);

    return deletingResult;
  }

  /**
   * Get container metadata.
   * @param {string} [containerName] Container name.
   * @param {boolean} showObjectCount Object count.
   */
  async getMetadata(containerName = this.container, showObjectCount = false) {
    // Get tenant auth info.
    const tenantAuthInfo = this.auth.getAuthInfo({ method: HttpRequest.Methods.GET });
    const { tenantToken, tenantPublicUrl } = tenantAuthInfo;

    // Check.
    if (!tenantPublicUrl) {
      throw new Error('Minio tenent public URL not defined.');
    }

    const url = `${tenantPublicUrl}/${containerName}`;
    const headers = { 'X-Auth-Token': tenantToken };

    // Do request to get container metadata.
    const containerMetadata = await HttpRequest.sendDetailed({
      url,
      headers,
      method: HttpRequest.Methods.HEAD,
      timeout: this.timeout,
    });
    !global.silentUpload && log.save('container-metadata', { containerMetadata });
    const containerMetadataHeaders = containerMetadata.headers;
    !global.silentUpload && log.save('container-metadata-headers', { containerMetadataHeaders });

    const bytesUsedCount = containerMetadataHeaders[CONTAINER_BYTES_USED_HEADER];
    const objectCount = containerMetadataHeaders[CONTAINER_OBJECT_COUNT_HEADER];
    !global.silentUpload && log.save('bytes-used-count', { bytesUsedCount });

    let bytesUsedCountNumber;
    try {
      bytesUsedCountNumber = Number(bytesUsedCount);
    } catch (error) {
      !global.silentUpload && log.save('get-minio-bytes-used-count-error', { bytesUsedCount, error });
      throw new Error(error);
    }
    const gigabytesUsedCount = (bytesUsedCountNumber / BYTES_IN_GIGABYTES).toFixed(2);
    const gigabytesUsedCountRound = Math.round(gigabytesUsedCount);

    return showObjectCount === 'true'
      ? {
        gigabytesUsedCount,
        gigabytesUsedCountRound,
        objectCount,
      }
      : { gigabytesUsedCount, gigabytesUsedCountRound };
  }

  /**
   * Get request headers.
   * @param {string} tenantToken Tenant token.
   */
  getRequestHeaders(tenantToken) {
    return {
      'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
      Accept: HttpRequest.Accepts.ACCEPT_JSON,
      'X-Auth-Token': tenantToken,
    };
  }
}

// Export.
module.exports = Minio;
