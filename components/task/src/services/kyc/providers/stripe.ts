import axios from 'axios';

import { KycProvider } from './provider';

const STATUS_MAP = {
  requires_input: 'waiting',
  processing: 'waiting',
  canceled: 'canceled',
  verified: 'verified',
};

export class StripeProvider extends KycProvider {
  config: any;

  constructor(config) {
    super();

    this.config = config;

    if (!this.config.isEnabled) {
      throw new Error(`${this.constructor.name}: Provider is not enabled`);
    }

    if (!this.config.publicKey) {
      throw new Error(`${this.constructor.name}: Missing publicKey in config`);
    }

    if (!this.config.secretKey) {
      throw new Error(`${this.constructor.name}: Missing secretKey in config`);
    }

    if (!this.config.apiUrl) {
      this.config.apiUrl = 'https://api.stripe.com';
    }

    if (!this.config.timeout) {
      this.config.timeout = 30000;
    }

    global.log.save('kyc-provider|stripe|initialized', true);
  }

  async testConnection() {
    try {
      await this.sendRequest('get', 'v1/balance');
    } catch {
      return false;
    }

    return true;
  }

  async createSession(userId, returnUrl) {
    const data = await this.sendRequest(
      'post',
      'v1/identity/verification_sessions',
      { type: 'document', client_reference_id: userId, return_url: returnUrl }
    );

    global.log.save('kyc-provider|stripe|create-session', { data });

    return {
      sessionId: data.id,
      redirectUrl: data.url,
      data,
    };
  }

  async getSession(sessionId) {
    const data = await this.sendRequest(
      'get',
      `v1/identity/verification_sessions/${sessionId}`
    );

    global.log.save('kyc-provider|stripe|get-session', { data });

    return {
      status: STATUS_MAP[data.status] || 'waiting',
      data,
    };
  }

  /**
   * Generate baseline request headers.
   * @private
   */
  get headers() {
    const basicToken = Buffer.from(`${this.config.secretKey}:`).toString(
      'base64'
    );
    return {
      'Authorization': `Basic ${basicToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Send a Stripe request.
   * @private
   */
  async sendRequest(method, uri, body?) {
    try {
      const requestOptions = {
        method,
        url: `${this.config.apiUrl}/${uri}`,
        headers: this.headers,
        timeout: this.config.timeout,
        data: body,
      };

      global.log.save('kyc-provider|stripe|request', {
        ...requestOptions,
        headers: { Authorization: 'Basic ***' },
      });

      const response = await axios(requestOptions);
      return response.data;
    } catch (error) {
      global.log.save(
        'kyc-provider|stripe|request-error',
        {
          error: error.message,
          method,
          uri,
          body,
          response: error.response?.data,
        },
        'error'
      );
      const wrapped: any = new Error(`Stripe request failed: ${error.message}`);
      wrapped.cause = error;
      throw wrapped;
    }
  }
}

