
const axios = require('axios');

// Constants.
const ROUTES = {
  decrypt: '/decrypt'
};

/**
 * Sign.
 */
class Sign {
  /**
   * Sign constructor.
   * @param {object} config Sign config.
   */
  constructor(config) {
    // Define singleton.
    if (!Sign.singleton) {
      const { url, token, timeout = 10000 } = config || global.config.sign;
      this.url = url;
      this.token = token;
      this.timeout = timeout;
      Sign.singleton = this;
    }

    // Return singleton.
    return Sign.singleton;
  }

  /**
   * Decrypt.
   * @param {string} data Data to sign.
   * @returns {Promise<string>} Sign service response promise.
   */
  async decrypt(data) {
    const requestOptions = {
      url: `${this.url}${ROUTES.decrypt}`,
      method: 'POST',
      headers: { token: this.token },
      data: { data },
      timeout: this.timeout
    };
    try {
      const responseBody = (await axios(requestOptions))?.data;
      if (!responseBody?.data) {
        log.save('sign-service-decrypt-empty-response-error', { responseBody });
        throw new Error('Sign.decrypt. Cannot get data from response.');
      }
      return responseBody.data;
    } catch (error) {
      log.save('sign-service-decrypt-error', {
        error: error && error.message,
        requestOptions: { ...requestOptions, body: '*****', headers: '*****' }
      });
      throw new Error(`Sign.decrypt. ${error?.toString()}`, { cause: error });
    }
  }
}

module.exports = Sign;
