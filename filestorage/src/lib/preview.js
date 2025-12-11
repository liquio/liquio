const axios = require('axios');
const { getConfig } = require('./config');

const DEFAULT_CONFIG = {
  server: 'http://0.0.0.0:3345',
  routes: {
    generatePreview: '/preview',
    ping: '/test/ping',
  },
};
const PREVIEW_CONTENT_TYPE = 'image/gif';
const PREVIEW_EXTENSION = 'gif';

/**
 * Preview.
 */
class Preview {
  /**
   * Preview constructor.
   * @param {object} [previewConfig] Preview config.
   */
  constructor(previewConfig) {
    // Define singleton.
    if (!Preview.singleton) {
      // Use provided config, or fall back to config from config module
      const configToUse = previewConfig !== undefined ? previewConfig : getConfig().preview;
      this.config = { ...DEFAULT_CONFIG, ...configToUse };
      this.generatePreviewUrl = `${this.config.server}${this.config.routes.generatePreview}`;
      this.sendTestPingUrl = `${this.config.server}${this.config.routes.ping}`;
      this.timeout = this.config.timeout || 5000;
      Preview.singleton = this;
    }
    return Preview.singleton;
  }

  /**
   * Content-type.
   * @returns {typeof PREVIEW_CONTENT_TYPE} Preview content-type.
   */
  static get ContentType() {
    return PREVIEW_CONTENT_TYPE;
  }

  /**
   * Extension.
   * @returns {typeof PREVIEW_EXTENSION} Preview extension.
   */
  static get Extension() {
    return PREVIEW_EXTENSION;
  }

  /**
   * Get preview.
   * @param {Buffer|string|ReadableStream} fileData File data.
   * @param {string} fileName File name.
   * @returns {string} Preview buffer.
   */
  async getPreview(fileData, fileName) {
    // Define request options.
    const fileExtension = (fileName || '').split('.').pop();
    
    try {
      // Use axios to get preview
      const response = await axios({
        method: 'POST',
        url: `${this.generatePreviewUrl}?file_extension=${fileExtension}`,
        data: fileData,
        timeout: this.timeout,
        responseType: 'arraybuffer',
        validateStatus: function (_status) {
          // Don't throw for HTTP error status codes - return them as buffers
          return true;
        }
      });

      // Convert ArrayBuffer to Buffer (regardless of status code)
      const fileContentBuffer = Buffer.from(response.data);
      return fileContentBuffer;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        // Timeout error
        throw new Error('Timeout');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // Network error
        throw new Error('Network error');
      } else {
        // Re-throw other errors as-is
        throw error;
      }
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}[]>}
   */
  async sendPingRequest() {
    try {
      const response = await axios({
        method: 'GET',
        url: this.sendTestPingUrl,
        timeout: this.timeout || 5000,
        validateStatus: function (status) {
          // Don't throw for HTTP error status codes - let us handle them
          return status >= 200 && status < 600;
        }
      });

      let result = response.data;
      
      // Handle different response body scenarios
      if (result === undefined || result === '') {
        result = undefined;
      } else if (result === null) {
        result = null;
      } else if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (parseError) {
          throw new Error(`Failed to parse response JSON: ${parseError.message}`);
        }
      }

      const headers = response.headers;

      // Extract the body.data if it exists (to match original behavior)
      // If result has a 'data' property, use that
      // If result is null, keep it as null
      // If result is empty object {}, return undefined
      // Otherwise use result itself
      let bodyData;
      if (result && Object.prototype.hasOwnProperty.call(result, 'data')) {
        bodyData = result.data;
      } else if (result === null) {
        bodyData = null;
      } else if (result && typeof result === 'object' && Object.keys(result).length === 0) {
        bodyData = undefined;
      } else {
        bodyData = result;
      }

      return {
        body: bodyData,
        version: headers['version'],
        customer: headers['customer'], 
        environment: headers['environment'],
      };
    } catch (error) {
      if (error.response) {
        // HTTP error response
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error');
      } else {
        // Other error
        throw error;
      }
    }
  }

  /**
   * Is preview allowed.
   * @param {string} contentType Content-type to check.
   */
  isPreviewAllowed(contentType) {
    return (this.config.contentTypes || []).some((v) => v === contentType);
  }
}

// Export.
module.exports = Preview;
