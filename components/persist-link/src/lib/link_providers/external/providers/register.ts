// Import.
import got from 'got';

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
  }

  /**
   * Get record.
   * @param {object} filter Filter.
   * @returns {Promise<boolean>}
   */
  async getRecord(filter) {
    const { url, token, timeout = 10000 } = this.config;

    // Request options.
    const requestOptions = {
      url: `${url}/records/${filter.recordId}`,
      method: 'GET',
      timeout,
      headers: { token: token, 'Content-Type': 'application/json' },
      responseType: 'json',
      resolveBodyOnly: true,
    };
    getLog().save('external-register-request', { url: urlForLog(requestOptions.url), recordId: filter.recordId });

    try {
      const response = await got(requestOptions);
      const data = response && response.data;
      getLog().save('external-register-response', {
        recordId: filter.recordId,
        hasData: !!data,
        size: data ? JSON.stringify(data).length : 0,
      });

      return response && response.data;
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
