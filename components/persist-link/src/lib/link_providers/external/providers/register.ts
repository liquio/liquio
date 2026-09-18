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
    getLog().save('external-register-request', { requestOptions });

    try {
      const response = await got(requestOptions);
      getLog().save('external-register-response', response);

      return response && response.data;
    } catch (error) {
      getLog().save('external-register-error', {
        ...filter,
        error: error && error.message,
      });

      throw error;
    }
  }
}

// Export.
export default RegisterProvider;
