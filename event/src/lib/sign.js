const axios = require('axios');

const { prepareAxiosErrorToLog } = require('./helpers');

// Constants.
const ROUTES = {
  sign: '/sign',
  hash: '/hash',
  signHash: '/sign-hash',
  encrypt: '/encrypt',
  decrypt: '/decrypt',
  internalSignatureToExternal: '/internal-signature-to-external',
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
   * Sign.
   * @param {string} data Data to sign.
   * @param {boolean} externalSign External sign.
   * @param {string} signType Sign type.
   * @param {boolean} base64 Base64.
   * @returns {Promise<string>} Sign service response promise.
   */
  async sign(data, externalSign = true, signType = '', base64 = false) {
    const requestOptions = {
      url: `${this.url}${ROUTES.sign}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        data,
        externalSign,
        signType,
        base64,
      },
      timeout: this.timeout,
    };
    try {
      return (await axios(requestOptions)).data;
    } catch (error) {
      log.save(
        'sign-service-sign-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Sign.
   * @param {string} data Hash to sign.
   * @returns {Promise<string>} Sign service response promise.
   */
  async signHash(data) {
    const requestOptions = {
      url: `${this.url}${ROUTES.signHash}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        data,
      },
      timeout: this.timeout,
    };
    try {
      return (await axios(requestOptions)).data;
    } catch (error) {
      log.save('sign-service-sign-hash-error', {
        ...prepareAxiosErrorToLog(error),
        requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
      }),
      'error';
      throw error;
    }
  }

  /**
   * Hash.
   * @param {string} data Data to generate hash.
   * @returns {Promise<string>} Generated hash.
   */
  async hash(data) {
    const requestOptions = {
      url: `${this.url}${ROUTES.hash}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        data,
      },
      timeout: this.timeout,
    };
    try {
      return (await axios(requestOptions)).data;
    } catch (error) {
      log.save(
        'sign-service-hash-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Encrypt.
   * @param {string} cert Certificate.
   * @param {string} data Data to sign.
   * @returns {Promise<string>} Sign service response promise.
   */
  async encrypt(cert, data) {
    const requestOptions = {
      url: `${this.url}${ROUTES.encrypt}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        cert,
        data,
      },
      timeout: this.timeout,
    };
    try {
      return (await axios(requestOptions)).data;
    } catch (error) {
      log.save(
        'sign-service-encrypt-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Decrypt.
   * @param {string} cert Certificate.
   * @param {string} data Data to sign.
   * @returns {Promise<string>} Sign service response promise.
   */
  async decrypt(cert, data) {
    const requestOptions = {
      url: `${this.url}${ROUTES.decrypt}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        cert,
        data,
      },
      timeout: this.timeout,
    };
    try {
      return await axios(requestOptions).data;
    } catch (error) {
      log.save(
        'sign-service-decrypt-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Convert internal (signature + data) signature to external (only signature).
   * @param {string} internalSignature
   * @returns {Promise<string>} externalSignature.
   */
  async convertInternalSignatureToExternal(internalSignature) {
    const requestOptions = {
      url: `${this.url}${ROUTES.internalSignatureToExternal}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        data: internalSignature,
      },
      timeout: this.timeout,
    };
    try {
      return (await axios(requestOptions)).data?.data;
    } catch (error) {
      log.save(
        'sign-service-convert-internal-signature-to-external-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: { ...requestOptions, data: '*****', headers: '*****' },
        },
        'error',
      );
      throw error;
    }
  }
}

module.exports = Sign;
