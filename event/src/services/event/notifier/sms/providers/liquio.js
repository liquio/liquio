const Provider = require('./provider');
const HttpRequest = require('../../../../../lib/http_request');
const { getTraceId } = require('../../../../../lib/async_local_storage');

/**
 * Liquio provider.
 */
class LiquioProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config) {
    // Define singleton.
    if (!LiquioProvider.singleton) {
      super();

      this.config = config;
      this.server = config.server;
      this.port = config.port;
      this.routes = config.routes;
      this.user = config.user;
      this.hashedPassword = config.hashedPassword;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${this.user}:${this.hashedPassword}`,
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
  async send(phones, message, translitMessage) {
    try {
      // Define request body.
      const body = {
        list_phone: Array.isArray(phones) ? phones : [phones],
        short_message: message,
        short_message_translit: translitMessage,
      };

      // Do request to send messages.
      log.save('sms-sending-request', body);
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.sendSms}`,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      });
      log.save('sms-sending-response', response);

      return {
        data: body,
        response,
      };
    } catch (error) {
      log.save('sms-sending-error', error.message);
      throw error;
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let response = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${this.routes.ping}_with_auth`,
          method: HttpRequest.Methods.GET,
          headers: this.getHeadersWithTraceId(),
        },
        fullResponse,
      );
      log.save('send-ping-request-to-notify', response);
      const headers = response && response.fullResponse && response.fullResponse.headers && response.fullResponse.headers;
      const { version, customer, environment } = headers;
      return { version, customer, environment, body: response.body };
    } catch (error) {
      log.save('send-ping-request-to-notify', error.message);
    }
  }

  getHeadersWithTraceId() {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }
}

module.exports = LiquioProvider;
