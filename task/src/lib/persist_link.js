
const axios = require('axios');

// Constants.
const DEFAULT_CONFIG = {
  server: 'https://persist-link-test-court-services.liquio.local',
  port: 443,
  routes: {
    generateQr: '/link?qr=svg',
    ping: '/test/ping',
    pingWithAuth: '/test/ping_with_auth'
  },
  token: '<removed>',
  getLinkToFilestorageTimeout: 30000
};

/**
 * Converter.
 */
class PersistLink {
  /**
   * Persist link constructor.
   * @param {object} persistLinkConfig Persist Link config.
   */
  constructor(persistLinkConfig = global.config.persist_link) {
    // Define singleton.
    if (!PersistLink.singleton) {
      this.config = { ...DEFAULT_CONFIG, ...(persistLinkConfig || {}) };
      this.config.routes = { ...DEFAULT_CONFIG.routes, ...persistLinkConfig.routes };
      this.generateQr = `${this.config.server}:${this.config.port}${this.config.routes.generateQr}`;
      this.sendTestPingUrl = `${this.config.server}:${this.config.port}${this.config.routes.pingWithAuth}`;
      this.getLinkToFilestorageTimeout = this.config.getLinkToFilestorageTimeout;
      PersistLink.singleton = this;
    }
    return PersistLink.singleton;
  }

  /**
   * Get QR and link to document with access via frontend.
   * @param {string} documentId Document ID.
   * @returns {Promise<{link: string, qrCode: string}>} Link and QR-code promise.
   */
  async getQrAndLinkToDocument(documentId) {
    try {
      const options = {
        method: 'POST',
        url: this.generateQr,
        headers: {
          'Content-Type': 'application/json',
          token: this.config.token
        },
        data: {
          type: 'simple',
          options: {
            url: `${this.config.urlToDocument}/${documentId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      log.save('get-persist-link-to-document-request-params', options);
      
      const response = await axios(options);
      
      if (response.status === 200) {
        const qrAndLink = response.data.data;
        log.save('get-persist-link-to-document-response', qrAndLink);
        return qrAndLink;
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        log.save('get-persist-link-to-document-response-error', error);
        throw error;
      }
    } catch (error) {
      log.save('get-persist-link-to-document-response-error', error);
      throw error;
    }
  }

  /**
   * Get QR and link to case with access via frontend.
   * @param {string} caseId Case ID.
   * @returns {Promise<{link: string, qrCode: string}>} Link and QR-code promise.
   */
  async getQrAndLinkToCase(caseId) {
    try {
      const options = {
        method: 'POST',
        url: this.generateQr,
        headers: {
          'Content-Type': 'application/json',
          token: this.config.token
        },
        data: {
          type: 'simple',
          options: {
            url: `${this.config.urlToCaseAndProceeding}=${caseId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      log.save('get-persist-link-to-case-request-params', options);
      
      const response = await axios(options);
      
      if (response.status === 200) {
        const qrAndLink = response.data.data;
        log.save('get-persist-link-to-case-response', qrAndLink);
        return qrAndLink;
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        log.save('get-persist-link-to-case-response-error', error);
        throw error;
      }
    } catch (error) {
      log.save('get-persist-link-to-case-response-error', error);
      throw error;
    }
  }

  /**
   * Get QR and link to proceeding with access via frontend.
   * @param {string} proceedingId Proceeding ID.
   * @returns {Promise<{link: string, qrCode: string}>} Link and QR-code promise.
   */
  async getQrAndLinkToProceeding(proceedingId, caseId) {
    try {
      const options = {
        method: 'POST',
        url: this.generateQr,
        headers: {
          'Content-Type': 'application/json',
          token: this.config.token
        },
        data: {
          type: 'simple',
          options: {
            url: `${this.config.urlToCaseAndProceeding}=${caseId}/proceeding=${proceedingId}`,
            redirect: true
          },
          small: true
        },
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      log.save('get-persist-link-to-permission-request-params', options);
      
      const response = await axios(options);
      
      if (response.status === 200) {
        const qrAndLink = response.data.data;
        log.save('get-persist-link-to-permission-response', qrAndLink);
        return qrAndLink;
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        log.save('get-persist-link-to-permission-response-error', error);
        throw error;
      }
    } catch (error) {
      log.save('get-persist-link-to-permission-response-error', error);
      throw error;
    }
  }

  /**
   * Get link to document with access via frontend.
   * @param {string} documentId Document ID.
   * @returns {Promise<string>} Link promise.
   */
  async getLinkToDocument(documentId) {
    return (await this.getQrAndLinkToDocument(documentId)).link;
  }

  /**
   * Get link to case with access via frontend.
   * @param {string} caseId Case ID.
   * @returns {Promise<string>} Link promise.
   */
  async getLinkToCase(caseId) {
    return (await this.getQrAndLinkToCase(caseId)).link;
  }

  /**
   * Get link to proceeding with access via frontend.
   * @param {string} proceedingId Proceeding ID.
   * @returns {Promise<string>} Link promise.
   */
  async getLinkToProceeding(proceedingId, caseId) {
    return (await this.getQrAndLinkToProceeding(proceedingId, caseId)).link;
  }

  /**
   * Get QR link to with access via frontend.
   * @param {string} documentId Document ID.
   * @returns {Promise<string>} QR code in svg format promise.
   */
  async getQrLinkToDocument(documentId) {
    return (await this.getQrAndLinkToDocument(documentId)).qrCode;
  }

  /**
   * Get QR link to static file in OpenStack.
   * @param {string} generatedFileName Url to file in OpenStack.
   * @return {string} QR code in svg format promise.
   */
  async getQrLinkToStaticFileInOpenStack(generatedFileName) {
    try {
      const options = {
        method: 'POST',
        url: this.generateQr,
        headers: {
          'Content-Type': 'application/json',
          token: this.config.token
        },
        data: {
          type: 'openStack',
          options: {
            serverName: this.config.serverName,
            fileName: generatedFileName
          },
          small: true
        },
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      log.save('get-persist-link-to-static-file-request-params', options);
      
      const response = await axios(options);
      
      if (response.status === 200) {
        const generatedQr = response.data.data.qrCode;
        log.save('get-persist-link-to-static-file-response', generatedQr);
        return generatedQr;
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        log.save('get-persist-link-to-static-file-response-error', error);
        throw error;
      }
    } catch (error) {
      log.save('get-persist-link-to-static-file-response-error', error);
      throw error;
    }
  }

  /**
   * Get link to static file in OpenStack.
   * @param {string} fileId File ID in Filestorage.
   * @param {string} definedHash Defined hash.
   * @return {string} QR code in svg format promise.
   */
  async getLinkToStaticFileInFilestorage(fileId, definedHash) {
    try {
      const options = {
        method: 'POST',
        url: this.generateQr,
        headers: {
          'Content-Type': 'application/json',
          token: this.config.token
        },
        data: {
          type: 'filestorage',
          options: {
            serverName: this.config.serverName,
            fileId
          },
          definedHash,
          small: true
        },
        timeout: this.getLinkToFilestorageTimeout,
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      log.save('get-persist-link-to-static-file-request-params', options);
      
      const response = await axios(options);
      
      if (response.status === 200) {
        log.save('get-persist-link-to-static-file-response', response.data.data);
        return response.data.data.link;
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        log.save('get-persist-link-to-static-file-response-error', { error, body: response.data });
        throw error;
      }
    } catch (error) {
      log.save('get-persist-link-to-static-file-response-error', { error, body: error.response?.data });
      throw error;
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}[]>}
   */
  async sendPingRequest() {
    try {
      const options = {
        method: 'GET',
        url: this.sendTestPingUrl,
        headers: { token: this.config.token },
        validateStatus: () => true // Don't reject on HTTP error status codes
      };
      
      const response = await axios(options);
      
      if (response.status === 200) {
        const headers = response.headers;
        const { version, customer, environment } = headers;
        const result = response.data;
        return { version, customer, environment, body: result && result.data };
      } else {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        console.log('error', error);
        throw error;
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}

module.exports = PersistLink;
