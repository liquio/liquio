const Provider = require('./provider');
const HttpRequest = require('../../../../../lib/http_request');
const { getTraceId } = require('../../../../../lib/async_local_storage');

const DEFAULT_ROUTES = {
  getStats: '/api/v2/stats',
  addSubscribersToGroup: '/api/v2/groups/{{groupId}}/subscribers/import',
};
const DEFAULT_SERVICE_URL = 'https://api.mailerlite.com';
const DEFAULT_TIMEOUT = 30000;

/**
 * MailerLite provider.
 */
class MailerLiteProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config) {
    // Singleton.
    if (!MailerLiteProvider.singleton) {
      // Call parent constructor.
      super();

      // Save params.
      this.config = config;
      this.routes = this.config.routes || DEFAULT_ROUTES;
      this.url = this.config.serviceUrl || DEFAULT_SERVICE_URL;
      this.timeout = this.config.timeout || DEFAULT_TIMEOUT;

      // Init singleton.
      MailerLiteProvider.singleton = this;
    }

    // Return singleton.
    return MailerLiteProvider.singleton;
  }

  /**
   * Send email.
   * @param {string|string[]} emails Recipient email or email list. User ID can be used instead email.
   * @returns {object[]}
   */
  async sendSubscribersToDigest(emails) {
    // Prepare request params.
    if (typeof emails === 'string') emails = [emails];
    const subscribers = emails.map((email) => {
      return { email: email };
    });

    let result;
    try {
      result = await this.addSubscribersToGroup(subscribers);
      if (result.errors && result.errors.length) {
        throw new Error('MailerLite add subscriber error: ' + result.errors.map((error) => error.email).join(','));
      }
      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      log.save('sms-sending-error', error.response.data);
      throw error;
    }

    // Return responses list.
    return { emails: subscribers, result };
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    try {
      return await this.getStats();
    } catch (error) {
      log.save('send-ping-request-to-mailerlite', { error: error && error.message });
    }
  }

  /**
   * @see https://developers.mailerlite.com/reference#add-many-subscribers
   * @param {array} subscribers - formatted array of subscribers
   * @param {string} subscribers[0].email - email string in properly formatted object
   * @return {Promise<Object>}
   */
  async addSubscribersToGroup(subscribers) {
    const url = this.url + this.routes.addSubscribersToGroup.replace('{{groupId}}', this.config.groupId);
    const requestOptions = {
      url,
      method: HttpRequest.Methods.POST,
      timeout: this.timeout,
      body: { subscribers },
      headers: {
        'X-MailerLite-ApiKey': this.config.apiKey,
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
      },
    };
    log.save('send-add-subscribers-to-group-request-to-mailerlite', { subscribers });
    const response = await HttpRequest.send(requestOptions);

    return response;
  }

  /**
   * @see https://developers.mailerlite.com/reference#stats
   * @return {Promise<Object>}
   */
  async getStats() {
    const requestOptions = {
      url: `${this.url}${this.routes.getStats}`,
      method: HttpRequest.Methods.GET,
      timeout: this.timeout,
      headers: {
        'X-MailerLite-ApiKey': this.config.apiKey,
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
      },
    };
    log.save('send-get-stats-request-to-mailerlite');
    const response = await HttpRequest.send(requestOptions);

    return response;
  }
}

module.exports = MailerLiteProvider;
