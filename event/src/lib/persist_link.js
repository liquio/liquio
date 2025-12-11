const axios = require('axios');

const { prepareAxiosErrorToLog } = require('./helpers');

// Constants.
const DEFAULT_CONFIG = {
  server: 'https://persist-link-test-court-services.liquio.local',
  port: 443,
  routes: {
    generateQr: '/link?qr=svg',
    ping: '/test/ping',
    pingWithAuth: '/test/ping_with_auth',
  },
  token: '<removed>',
};

/**
 * Persist link.
 */
class PersistLink {
  /**
   * Persist link constructor.
   * @param {object} persistLinkConfig Persist Link config.
   */
  constructor(persistLinkConfig = config.persist_link) {
    // Define singleton.
    if (!PersistLink.singleton) {
      this.config = { ...DEFAULT_CONFIG, ...persistLinkConfig };
      this.config.routes = { ...DEFAULT_CONFIG.routes, ...persistLinkConfig.routes };
      this.generateQr = `${this.config.server}:${this.config.port}${this.config.routes.generateQr}`;
      this.sendTestPingUrl = `${this.config.server}:${this.config.port}${this.config.routes.pingWithAuth}`;
      this.getLinkToFilestorageTimeout = (persistLinkConfig && persistLinkConfig.getLinkToFilestorageTimeout) || 30000;
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
    const options = {
      method: 'POST',
      url: this.generateQr,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
      data: {
        type: 'simple',
        options: {
          url: `${this.config.urlToDocument}/${documentId}`,
          redirect: true,
        },
        small: true,
      },
    };
    log.save('get-persist-link-to-document-request-params', options);

    try {
      const responseData = (await axios(options)).data;
      const qrAndLink = responseData.data;
      log.save('get-persist-link-to-document-response', qrAndLink);
      return qrAndLink;
    } catch (error) {
      log.save('get-persist-link-to-document-response-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Get QR and link to case with access via frontend.
   * @param {string} caseId Case ID.
   * @returns {Promise<{link: string, qrCode: string}>} Link and QR-code promise.
   */
  async getQrAndLinkToCase(caseId) {
    const options = {
      method: 'POST',
      url: this.generateQr,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
      data: {
        type: 'simple',
        options: {
          url: `${this.config.urlToCaseAndProceeding}=${caseId}`,
          redirect: true,
        },
        small: true,
      },
    };
    log.save('get-persist-link-to-case-request-params', options);

    try {
      const responseData = (await axios(options)).data;
      const qrAndLink = responseData.data;
      log.save('get-persist-link-to-case-response', qrAndLink);
      return qrAndLink;
    } catch (error) {
      log.save('get-persist-link-to-case-response-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Get QR and link to proceeding with access via frontend.
   * @param {string} proceedingId Proceeding ID.
   * @returns {Promise<{link: string, qrCode: string}>} Link and QR-code promise.
   */
  async getQrAndLinkToProceeding(proceedingId, caseId) {
    const options = {
      method: 'POST',
      url: this.generateQr,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
      data: {
        type: 'simple',
        options: {
          url: `${this.config.urlToCaseAndProceeding}=${caseId}/proceeding=${proceedingId}`,
          redirect: true,
        },
        small: true,
      },
    };
    log.save('get-persist-link-to-permission-request-params', options);

    try {
      const responseData = (await axios(options)).data;
      const qrAndLink = responseData.data;
      log.save('get-persist-link-to-permission-response', qrAndLink);
      return qrAndLink;
    } catch (error) {
      log.save('get-persist-link-to-permission-response-error', prepareAxiosErrorToLog(error), 'error');
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
    const options = {
      method: 'POST',
      url: this.generateQr,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
      data: {
        type: 'openStack',
        options: {
          serverName: this.config.serverName,
          fileName: generatedFileName,
        },
        small: true,
      },
    };
    log.save('get-persist-link-to-static-file-request-params', options);

    try {
      const { data: responseData } = (await axios(options)).data;
      const generatedQr = responseData.qrCode;
      log.save('get-persist-link-to-static-file-response', generatedQr);
      return generatedQr;
    } catch (error) {
      log.save('get-persist-link-to-static-file-response-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Get link to static file in OpenStack.
   * @param {string} fileId File ID in Filestorage.
   * @param {string} definedHash Defined hash.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.isP7s Must we return link to p7s of file.
   * @return {Promise<string>} QR code in svg format promise.
   */
  async getLinkToStaticFileInFilestorage(fileId, definedHash) {
    const options = {
      method: 'POST',
      url: this.generateQr,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
      data: {
        type: 'filestorage',
        options: {
          serverName: this.config.serverName,
          fileId,
        },
        definedHash,
        small: true,
      },
      timeout: this.getLinkToFilestorageTimeout,
    };
    log.save('get-persist-link-to-static-file-request-params', options);

    try {
      const { data: responseData } = (await axios(options)).data;
      const generatedLink = responseData.link;
      log.save('get-persist-link-to-static-file-response', generatedLink);
      return generatedLink;
    } catch (error) {
      log.save('get-persist-link-to-static-file-response-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}[]>}
   */
  async sendPingRequest() {
    const options = {
      method: 'GET',
      url: this.sendTestPingUrl,
      headers: { token: this.config.token },
    };

    try {
      const response = await axios(options);
      const { version, customer, environment } = response.headers;
      const responseData = response.data;

      return {
        version,
        customer,
        environment,
        body: responseData?.data,
      };
    } catch (error) {
      log.save('send-ping-request-response-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }
}

module.exports = PersistLink;
