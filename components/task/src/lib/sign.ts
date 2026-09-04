import axios from 'axios';

// Constants.
const ROUTES = {
  decrypt: '/decrypt',
};

/**
 * Sign.
 */
export class Sign {
  private static singleton: Sign;

  timeout: any;
  token: any;
  url: any;

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
      timeout: this.timeout,
    };
    try {
      const responseBody = (await axios(requestOptions))?.data;
      if (!responseBody?.data) {
        global.log.save('sign-service-decrypt-empty-response-error', { responseBody });
        throw new Error('Sign.decrypt. Cannot get data from response.');
      }
      return responseBody.data;
    } catch (error) {
      global.log.save('sign-service-decrypt-error', {
        error: error && error.message,
        requestOptions: { ...requestOptions, body: '*****', headers: '*****' },
      });
      const wrapped: any = new Error(`Sign.decrypt. ${error?.toString()}`);
      wrapped.cause = error;
      throw wrapped;
    }
  }
}
