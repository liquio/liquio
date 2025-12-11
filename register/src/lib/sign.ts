import axios, { AxiosRequestConfig } from 'axios';

import prepareAxiosErrorToLog from './prepareAxiosErrorToLog';

import Log from './log';

// Constants.
const ROUTES = {
  verifySignatureExternal: '/verify-signature-external'
};

export interface SignConfig {
  url: string;
  token: string;
  timeout?: number;
}

/**
 * Sign.
 */
export default class Sign {
  static singleton: Sign;
  log: Log;

  url: string;
  token: string;
  timeout: number;

  /**
   * Sign constructor.
   * @param {object} config Sign config.
   */
  constructor(config: SignConfig) {
    // Define singleton.
    if (!Sign.singleton) {
      this.log = Log.getInstance();
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
   * @param {string} data Data to check, in Base64.
   * @param {string} signature Signature without data.
   * @returns {Promise<{error?: string, data?: {subjDRFOCode: string}}>}
   */
  async verifySignatureExternal(data: string, signature: string) {
    const requestOptions: AxiosRequestConfig = {
      url: `${this.url}${ROUTES.verifySignatureExternal}`,
      method: 'POST',
      headers: { token: this.token },
      data: {
        data,
        signature
      },
      timeout: this.timeout
    };
    try {
      const { data: response } = await axios(requestOptions);
      return response;
    } catch (error) {
      global.log.save(
        'sign-service-verify-signature-external-error',
        {
          ...prepareAxiosErrorToLog(error),
          requestOptions: {
            ...requestOptions,
            headers: '*****'
          }
        },
        'error'
      );
      throw error;
    }
  }
}
