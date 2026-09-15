// Import.
import request from 'request';

import { getLog } from '../../../context';
import Auth from './auth';
import HttpRequest from './http_request';

// Constants.
const DEFAULT_ROUTES = {
  getTokens: '/v2.0/tokens',
};
const DEFAULT_CONTAINER = 'default';

/**
 * OpenStack connection.
 */
class OpenStackConnection {
  /**
   * OpenStack connection constructor.
   * @param {object} connectionConfig OpenStack connection config.
   */
  constructor(connectionConfig) {
    this.config = connectionConfig;
    this.server = connectionConfig.server;
    this.port = connectionConfig.port;
    this.routes = { ...DEFAULT_ROUTES, ...connectionConfig.routes };
    this.timeout = connectionConfig.timeout;
    this.tenantName = connectionConfig.tenantName;
    this.accounts = { admin: connectionConfig.admin, user: connectionConfig.user };
    this.container = connectionConfig.container || DEFAULT_CONTAINER;
    this.auth = new Auth(this);
  }

  /**
   * Get info to handle file.
   * @param {string} filePath File path.
   * @param {string} [containerName] Container name.
   * @returns {Promise<{url: string, headers: object}>} Info to download file.
   */
  async getInfoToHandleFile(filePath, containerName = this.container) {
    // Get tenant auth info.
    const tenantAuthInfo = await this.auth.getTenantAuthInfo();
    const { tenantToken, tenantPublicUrl } = tenantAuthInfo;

    // Do request to get containers.
    const url = `${tenantPublicUrl}/${containerName}/${filePath}`;
    const infoToDownloadFile = {
      url,
      headers: { 'X-Auth-Token': tenantToken },
    };
    return infoToDownloadFile;
  }

  /**
   * Download file request options.
   * @param {string} filePath File path.
   * @param {string} [containerName] Container name.
   * @returns {Promise<ReadableStream>} Readable stream to download file.
   */
  async downloadFileRequestOptions(filePath, containerName = this.container) {
    // Get info to handle file.
    getLog().save('openstack-file-downloading', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile(filePath, containerName);
    const { url, headers } = infoToHandleFile;

    // Get and return request options.
    return { url, headers, method: HttpRequest.Methods.GET, timeout: this.timeout };
  }

  /**
   * Download file.
   * @param {string} filePath File path.
   * @param {string} [containerName] Container name.
   * @returns {Promise<ReadableStream>} Readable stream to download file.
   */
  async downloadFile(filePath, containerName = this.container) {
    // Get info to handle file.
    getLog().save('openstack-file-downloading', { filePath });
    const infoToHandleFile = await this.getInfoToHandleFile(filePath, containerName);
    const { url, headers } = infoToHandleFile;

    // Get readable stream to download file.
    return request({ url, headers, method: HttpRequest.Methods.GET, timeout: this.timeout });
  }
}

// Export.
export default OpenStackConnection;
