// Import.
import { createRegisterApiClient } from '@liquio/back-core';

import { getLog } from '../../../context';
import Provider from './provider';

/**
 * Strip userinfo and query from a URL before logging.
 * @param {string} url URL.
 * @returns {string}
 */
const urlForLog = (url) => {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
};

/**
 * Register provider.
 */
class RegisterProvider extends Provider {
  /**
   * Register provider constructor.
   * @param {object} config Register provider config.
   */
  constructor(config) {
    // Call parent constructor.
    super(config);
    this.client = config ? this.createClient(config) : undefined;
  }

  /**
   * Create register API client.
   * @param {object} config Register provider config.
   * @returns {object}
   */
  createClient(config) {
    const { url, token, timeout = 10000 } = config;
    return createRegisterApiClient({ url, token, timeout, getLog });
  }

  /**
   * Get record.
   * @param {object} filter Filter.
   * @returns {Promise<boolean>}
   */
  async getRecord(filter) {
    const { url } = this.config;
    const client = this.client || (this.client = this.createClient(this.config));

    getLog().save('external-register-request', {
      url: urlForLog(`${url}/records/${filter.recordId}`),
      recordId: filter.recordId,
    });

    try {
      const data = await client.findRecordById(filter.recordId);
      getLog().save('external-register-response', {
        recordId: filter.recordId,
        hasData: !!data,
        size: data ? JSON.stringify(data).length : 0,
      });

      return data;
    } catch (error) {
      getLog().save('external-register-error', {
        recordId: filter.recordId,
        error: error && error.message,
      });

      throw error;
    }
  }
}

// Export.
export default RegisterProvider;
