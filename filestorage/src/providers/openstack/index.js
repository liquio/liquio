const axios = require('axios');

const Provider = require('../provider');
const Auth = require('./auth');
const Request = require('../../lib/http_request');

const EXTERNAL_SERVICE_NAME = 'openstack';
const PROVIDER_NAME = 'openstack';
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
 * OpenStack.
 */
class OpenStack extends Provider {
  /**
   * OpenStack constructor.
   * @param {object} openStackConfig OpenStack config.
   */
  constructor(openStackConfig) {
    // Define singleton.
    if (!OpenStack.singleton) {
      super();
      this.config = openStackConfig;
      this.server = openStackConfig.server;
      this.authVersion = openStackConfig.authVersion || DEFAULT_AUTH_VERSION;
      this.routes = { ...DEFAULT_ROUTES, ...openStackConfig.routes };
      this.timeout = openStackConfig.timeout;
      this.tenantName = openStackConfig.tenantName;
      this.account = openStackConfig.account;
      this.container = openStackConfig.container || DEFAULT_CONTAINER;
      this.authCacheTtl = openStackConfig.authCacheTtl || AUTH_CACHE_TTL;
      this.auth = new Auth(this);
      OpenStack.singleton = this;
    }
    return OpenStack.singleton;
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
   * @param {string} [containerName] Container name.
   * @returns {Promise<{url: string, headers: object}>} Info to download file.
   */
  async getInfoToHandleFile(filePath, containerName = this.container) {
    // Metrics timer.
    const timer = new Date();

    // Get tenant auth info.
    const tenantAuthInfo = await this.auth.getTenantAuthInfo();
    const { tenantToken, tenantPublicUrl } = tenantAuthInfo;

    // Save metrics.
    this.externalServiceMetric('getTenantAuthInfo', timer);

    // Check.
    if (!tenantPublicUrl) {
      throw new Error('OpenStack tenent public URL not defined.');
    }

    // Do request to get containers.
    const url = `${tenantPublicUrl}/${containerName}/${filePath}`;
    const infoToDownloadFile = {
      url,
      headers: { 'X-Auth-Token': tenantToken },
    };

    // Save metrics.
    this.externalServiceMetric('getInfoToHandleFile', timer);

    return infoToDownloadFile;
  }

  /**
   * Download file request options.
   * @param {string} filePath File path.
   * @returns {Promise<object>} Request options.
   */
  async downloadFileRequestOptions(filePath) {
    // Metrics timer.
    const timer = new Date();

    // Get info to handle file.
    log.save('openstack-file-downloading', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile(filePath);
    const { url, headers } = infoToHandleFile;

    // Get and return request options.
    log.save('openstack-file-downloading|request-options', {
      url,
      headers,
      method: Request.Methods.GET,
      timeout: this.timeout,
    });

    // Save metrics.
    this.externalServiceMetric('downloadFileRequestOptions', timer);

    return { url, headers, method: Request.Methods.GET, timeout: this.timeout };
  }

  /**
   * Download file.
   * @param {string} filePath File path.
   * @returns {Promise<ReadableStream>} Readable stream to download file.
   */
  async downloadFile(filePath) {
    // Define request options.
    const requestOptions = await this.downloadFileRequestOptions(filePath);

    // Return downloading stream using axios
    const response = await axios({
      method: requestOptions.method,
      url: requestOptions.url,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      responseType: 'stream'
    });

    return response.data;
  }

  /**
   * Download file as buffer.
   * @param {string} filePath File path.
   * @returns {Promise<Buffer>} File buffer.
   */
  async downloadFileAsBuffer(filePath) {
    // Metrics timer.
    const timer = new Date();

    // Define request options.
    const requestOptions = await this.downloadFileRequestOptions(filePath);

    // Download file using axios
    const response = await axios({
      method: requestOptions.method,
      url: requestOptions.url,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      responseType: 'arraybuffer'
    });

    // Convert ArrayBuffer to Buffer
    const dataBuffer = Buffer.from(response.data);

    // Save metrics.
    this.externalServiceMetric('downloadFileAsBuffer', timer);

    return dataBuffer;
  }

  /**
   * Upload file request options.
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<WritableStream>} Writable stream to upload file.
   */
  async uploadFileRequestOptions(filePath, contentType, fileContent) {
    // Metrics timer.
    const timer = new Date();

    // Get info to handle file.
    log.save('openstack-file-uploading', { filePath, contentType });
    const infoToHandleFile = await this.getInfoToHandleFile(filePath);
    const { url, headers } = infoToHandleFile;
    headers['Content-Type'] = contentType;
    const body = fileContent;

    // Get and return request options.
    log.save('openstack-file-uploading|request-options', {
      url,
      headers,
      method: Request.Methods.PUT,
      body: '***',
      timeout: this.timeout,
    });

    // Save metrics.
    this.externalServiceMetric('uploadFileRequestOptions', timer);

    return { url, headers, method: Request.Methods.PUT, body, timeout: this.timeout };
  }

  /**
   * Upload file.
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<{fileLink, hash}>} Promise of file info.
   */
  async uploadFile(filePath, contentType, fileContent) {
    // Metrics timer.
    const timer = new Date();

    // Define request options.
    const requestOptions = await this.uploadFileRequestOptions(filePath, contentType, fileContent);

    try {
      // Upload using axios
      const response = await axios({
        method: requestOptions.method,
        url: requestOptions.url,
        headers: requestOptions.headers,
        data: requestOptions.body,
        timeout: requestOptions.timeout,
        validateStatus: () => true // Don't throw on any status code
      });

      // Check response and log
      const requestOptionsToLog = { ...requestOptions, body: '***' };
      log.save('openstack-uploading-file-response', {
        requestOptions: requestOptionsToLog,
        filePath,
        body: response.data,
        headers: response.headers,
      });

      // Return uploaded file info.
      const fileLink = filePath;
      const hash = response.headers && response.headers.etag;
      const uploadedFileInfo = { fileLink, hash };

      // Save metrics.
      this.externalServiceMetric('uploadFile', timer);

      return uploadedFileInfo;
    } catch (error) {
      log.save('openstack-uploading-error', { error: error && error.message, filePath });
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
    // Metrics timer.
    const timer = new Date();

    // Get info to handle file.
    log.save('openstack-file-deleting', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile(filePath, containerName);
    const { url, headers } = infoToHandleFile;

    // Delete file.
    const deletingResult = await Request.send({ url, headers, method: Request.Methods.DELETE, timeout: this.timeout });
    log.save('openstack-file-deleting-result', deletingResult);

    // Save metrics.
    this.externalServiceMetric('deleteFile', timer);

    return deletingResult;
  }

  /**
   * Get container metadata.
   * @param {string} [containerName] Container name.
   * @param {boolean} showObjectCount Object count.
   */
  async getMetadata(containerName = this.container, showObjectCount = false) {
    // Metrics timer.
    const timer = new Date();

    // Get tenant auth info.
    const tenantAuthInfo = await this.auth.getTenantAuthInfo();
    const { tenantToken, tenantPublicUrl } = tenantAuthInfo;

    // Check.
    if (!tenantPublicUrl) {
      throw new Error('OpenStack tenent public URL not defined.');
    }

    const url = `${tenantPublicUrl}/${containerName}`;
    const headers = { 'X-Auth-Token': tenantToken };

    // Do request to get container metadata.
    const containerMetadata = await Request.sendDetailed({
      url,
      headers,
      method: Request.Methods.HEAD,
      timeout: this.timeout,
    });
    log.save('container-metadata', { containerMetadata });
    const containerMetadataHeaders = containerMetadata.headers;
    log.save('container-metadata-headers', { containerMetadataHeaders });

    const bytesUsedCount = containerMetadataHeaders[CONTAINER_BYTES_USED_HEADER];
    const objectCount = containerMetadataHeaders[CONTAINER_OBJECT_COUNT_HEADER];
    log.save('bytes-used-count', { bytesUsedCount });

    let bytesUsedCountNumber;
    try {
      bytesUsedCountNumber = Number(bytesUsedCount);
    } catch (error) {
      log.save('get-openstack-bytes-used-count-error', { bytesUsedCount, error });
      throw new Error(error);
    }
    const gigabytesUsedCount = (bytesUsedCountNumber / BYTES_IN_GIGABYTES).toFixed(2);
    const gigabytesUsedCountRound = Math.round(gigabytesUsedCount);

    // Save metrics.
    this.externalServiceMetric('deleteFile', timer);

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
      'Content-Type': Request.ContentTypes.CONTENT_TYPE_JSON,
      Accept: Request.Accepts.ACCEPT_JSON,
      'X-Auth-Token': tenantToken,
    };
  }

  /**
   * External service metric.
   * @param {string} methodName Method name.
   * @param {Date} timer Query start metric timer.
   */
  externalServiceMetric(methodName, timer) {
    // Check metrics initialization.
    if (!global.metrics || !global.metrics.increment || !global.metrics.timing) {
      return;
    }

    // Define params.
    const currentMetricName = `external_services.${EXTERNAL_SERVICE_NAME}.${methodName}`;
    const allMetricName = `external_services.${EXTERNAL_SERVICE_NAME}.all`;
    const currentTimeMetricName = `external_services.${EXTERNAL_SERVICE_NAME}.${methodName}.response_time`;
    const allTimeMetricName = `external_services.${EXTERNAL_SERVICE_NAME}.all.response_time`;

    // Init metrics.
    global.metrics.increment(currentMetricName);
    global.metrics.increment(allMetricName);
    global.metrics.timing(currentTimeMetricName, timer);
    global.metrics.timing(allTimeMetricName, timer);
  }
}

// Export.
module.exports = OpenStack;
