import type https from 'node:https';

import axios from 'axios';

import { getConfig } from './config';
import { createHttpsAgent } from './tls';
import { getLog } from './context';

const DEFAULT_CONFIG = {
  // Empty server disables preview generation.
  server: '',
  routes: {
    generatePreview: '/preview',
    ping: '/test/ping',
  },
};
const PREVIEW_CONTENT_TYPE = 'image/gif';
const PREVIEW_EXTENSION = 'gif';
const INTERNAL_HOST_REGEXP =
  /^(localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[?::1?\]?|[^.]+|.+\.(svc|local|internal|cluster\.local|svc\.cluster\.local))$/i;
const SAFE_FILE_EXTENSION_REGEXP = /^[a-z0-9]{1,10}$/i;

/**
 * Preview.
 */
export class Preview {
  static singleton: Preview;

  config: any;
  generatePreviewUrl: string;
  sendTestPingUrl: string;
  timeout: number;
  httpsAgent?: https.Agent;
  enabled: boolean;

  /**
   * Preview constructor.
   * @param {object} [previewConfig] Preview config.
   */
  constructor(previewConfig?: any) {
    // Define singleton.
    if (!Preview.singleton) {
      // Use provided config, or fall back to config from config module
      const configToUse = previewConfig !== undefined ? previewConfig : getConfig().preview;
      this.config = { ...DEFAULT_CONFIG, ...configToUse };
      this.enabled = typeof this.config.server === 'string' && this.config.server.trim() !== '';
      this.generatePreviewUrl = `${this.config.server}${this.config.routes.generatePreview}`;
      this.sendTestPingUrl = `${this.config.server}${this.config.routes.ping}`;
      this.timeout = this.config.timeout || 5000;
      this.httpsAgent = createHttpsAgent(this.config.tls);
      if (this.enabled) {
        this.warnIfInsecureTransport();
      }
      Preview.singleton = this;
    }
    return Preview.singleton;
  }

  /**
   * Warn when file bytes would be sent over plain http to a non-internal host.
   * @private
   */
  private warnIfInsecureTransport() {
    let url: URL;
    try {
      url = new URL(this.config.server);
    } catch {
      getLog()?.save('preview-server-invalid-url', { server: this.config.server });
      return;
    }
    if (url.protocol === 'http:' && !INTERNAL_HOST_REGEXP.test(url.hostname)) {
      getLog()?.save('preview-server-insecure-http', {
        host: url.hostname,
        message: 'Files are sent to the preview server over plain http on a non-internal host; use https or an internal address.',
      });
    }
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
   * @returns {string} Preview buffer, or undefined when preview is disabled.
   */
  async getPreview(fileData: any, fileName: string) {
    if (!this.enabled) {
      return undefined;
    }
    // Define request options.
    // Only a short alphanumeric extension is passed on; anything else is sent as empty.
    const rawExtension = (fileName || '').split('.').pop();
    const fileExtension = SAFE_FILE_EXTENSION_REGEXP.test(rawExtension) ? rawExtension : '';

    try {
      // Use axios to get preview
      const response = await axios({
        method: 'POST',
        url: this.generatePreviewUrl,
        params: { file_extension: fileExtension },
        data: fileData,
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
        responseType: 'arraybuffer',
        validateStatus: function (_status) {
          // Don't throw for HTTP error status codes - return them as buffers
          return true;
        },
      });

      // Convert ArrayBuffer to Buffer (regardless of status code)
      const fileContentBuffer = Buffer.from(response.data);
      return fileContentBuffer;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        // Timeout error
        const wrappedError = new Error('Timeout');
        (wrappedError as any).cause = error;
        throw wrappedError;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // Network error
        const wrappedError = new Error('Network error');
        (wrappedError as any).cause = error;
        throw wrappedError;
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
    if (!this.enabled) {
      return undefined;
    }
    try {
      const response = await axios({
        method: 'GET',
        url: this.sendTestPingUrl,
        timeout: this.timeout || 5000,
        httpsAgent: this.httpsAgent,
        validateStatus: function (status) {
          // Don't throw for HTTP error status codes - let us handle them
          return status >= 200 && status < 600;
        },
      });

      let result: any = response.data;

      // Handle different response body scenarios
      if (result === undefined || result === '') {
        result = undefined;
      } else if (result === null) {
        result = null;
      } else if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (parseError) {
          const wrappedError = new Error(`Failed to parse response JSON: ${parseError.message}`);
          (wrappedError as any).cause = parseError;
          throw wrappedError;
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
        const wrappedError = new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        (wrappedError as any).cause = error;
        throw wrappedError;
      } else if (error.request) {
        // Network error
        const wrappedError = new Error('Network error');
        (wrappedError as any).cause = error;
        throw wrappedError;
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
  isPreviewAllowed(contentType: string) {
    if (!this.enabled) {
      return false;
    }
    return (this.config.contentTypes || []).some((v) => v === contentType);
  }
}
