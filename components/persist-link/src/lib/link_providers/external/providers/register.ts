// Import.
import got from 'got';

import { getLog } from '../../../context';
import Provider from './provider';

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
    getLog().save('external-register-request', { url: requestOptions.url, recordId: filter.recordId });

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
