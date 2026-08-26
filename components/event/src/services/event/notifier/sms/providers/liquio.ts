import { getTraceId } from '@liquio/back-core';

import { HttpRequest } from '../../../../../lib/http_request';
import { Provider } from './provider';

/**
 * Liquio provider.
 */
export class LiquioProvider extends Provider {
  static singleton: LiquioProvider;

  config: any;
  server: string;
  port: number;
  routes: any;
  user: string;
  password: string;
  headers: Record<string, string>;

  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config: any) {
    // Define singleton.
    if (!LiquioProvider.singleton) {
      super();

      this.config = config;
      this.server = config.server;
      this.port = config.port;
      this.routes = config.routes;
      this.user = config.user;
      this.password = config.password;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`, 'utf8').toString('base64')}`,
      };
      LiquioProvider.singleton = this;
    }

    return LiquioProvider.singleton;
  }

  /**
   * Send sms.
   * @param {string|string[]} phones Phones.
   * @param {string} message Subject.
   * @param {string} translitMessage HTML body.
   * @returns {object}
   */
  async send(phones: string | string[], message: string, translitMessage: string): Promise<any> {
    try {
      // Define request body.
      const body = {
        list_phone: Array.isArray(phones) ? phones : [phones],
        short_message: message,
        short_message_translit: translitMessage,
      };

      // Do request to send messages.
      global.log.save('sms-sending-request', body);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.sendSms}`,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      });
      global.log.save('sms-sending-response', response);

      return {
        data: body,
        response,
      };
    } catch (error: any) {
      global.log.save('sms-sending-error', error.message);
      throw error;
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    const fullResponse = true;

    try {
      const response: any = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${this.routes.ping}_with_auth`,
          method: HttpRequest.Methods.GET,
          headers: this.getHeadersWithTraceId(),
        },
        fullResponse,
      );
      global.log.save('send-ping-request-to-notify', response);
      const headers = response && response.fullResponse && response.fullResponse.headers && response.fullResponse.headers;
      const { version, customer, environment } = headers;
      return { version, customer, environment, body: response.body };
    } catch (error: any) {
      global.log.save('send-ping-request-to-notify', error.message);
    }
  }

  getHeadersWithTraceId(): Record<string, string> {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }
}
