const querystring = require('querystring');

const HttpRequest = require('../lib/http_request');
const { getTraceId } = require('../lib/async_local_storage');

/**
 * Notifier service.
 */
class NotifierService {
  /**
   * Notifier constructor.
   */
  constructor() {
    // Define singleton.
    if (!NotifierService.singleton) {
      this.server = config.notifier.server;
      this.port = config.notifier.port;
      this.user = config.notifier.user;
      this.routes = config.notifier.routes;
      this.hashedPassword = config.notifier.hashedPassword;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${this.user}:${this.hashedPassword}`,
      };
      this.timeout = config.notifier.timeout || 30000;
      NotifierService.singleton = this;
    }

    // Return singleton.
    return NotifierService.singleton;
  }

  /**
   * Send message to all.
   * @param {object} messageBody Message body.
   */
  async sendMessageToAll(messageBody) {
    const body = {
      title_message: messageBody.title,
      full_message: messageBody.text,
    };

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.toAll}`,
      method: HttpRequest.Methods.POST,
      headers: this.getHeadersWithTraceId(),
      body,
      timeout: this.timeout,
      json: true,
    });
    log.save('send-message-to-all-notifier-service-response', response);

    return response;
  }

  /**
   * Get messages for all users.
   * @param {number} start Start from message.
   * @param {number} count
   */
  async getMessagesForAllUsers(start, count) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.toAll}?start=${start}&count=${count}`,
      method: HttpRequest.Methods.GET,
      headers: this.getHeadersWithTraceId(),
      timeout: this.timeout,
    });
    log.save('get-message-for-all-notifier-service-response', response);

    return response;
  }

  /**
   * Delete messages for all users.
   * @param {number} messageId Message Id.
   */
  async deleteMessagesForAllUsers(messageId) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.toAll}/${messageId}`,
      method: HttpRequest.Methods.DELETE,
      headers: this.getHeadersWithTraceId(),
      timeout: this.timeout,
    });
    log.save('delete-message-for-all-notifier-service-response', response);

    return response;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let responseData = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${this.routes.ping}_with_auth`,
          method: HttpRequest.Methods.GET,
          headers: this.getHeadersWithTraceId(),
          timeout: this.timeout,
        },
        fullResponse,
      );

      const body = responseData && responseData.body;
      const headers = responseData && responseData.response && responseData.response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;

      return { version, customer, environment, body };
    } catch (error) {
      log.save('send-ping-request-to-notify', error.message);
    }
  }

  async getMessageTemplates(params) {
    const query = params ? this.queryParamsToString(params) : '';
    return HttpRequest.send({
      url: `${this.server}:${this.port}/template?${query}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
    });
  }

  async createMessageTemplate(dto) {
    return HttpRequest.send({
      url: `${this.server}:${this.port}/template`,
      method: HttpRequest.Methods.POST,
      body: JSON.stringify(dto),
      headers: this.getHeadersWithTraceId(),
    });
  }

  async updateMessageTemplate(id, dto) {
    return HttpRequest.send({
      url: `${this.server}:${this.port}/template/${id}`,
      method: HttpRequest.Methods.PUT,
      body: JSON.stringify(dto),
      headers: this.getHeadersWithTraceId(),
    });
  }

  async deleteMessageTemplate(id) {
    try {
      await HttpRequest.send({
        url: `${this.server}:${this.port}/template/${id}`,
        method: HttpRequest.Methods.DELETE,
        headers: this.getHeadersWithTraceId(),
      });
    } catch (error) {
      log.save('delete-message-template-error', { error: error.message || error.toString(), id }, 'error');
      throw error;
    }
  }

  async sendMessageByEmails({ emailsList, subject, fullText }) {
    const body = {
      list_email: emailsList,
      title_message: subject,
      full_message: fullText,
    };

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.sendToUserEmails}`,
      method: HttpRequest.Methods.POST,
      headers: this.getHeadersWithTraceId(),
      body,
      timeout: this.timeout,
      json: true,
    });
    log.save('send-message-by-emails-notifier-service-response', response);

    return response;
  }

  async sendMessageByUserIds({ userIdsList, subject, fullText }) {
    const body = {
      list_user_id: userIdsList,
      title_message: subject,
      full_message: fullText,
    };

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.sendToUserList}`,
      method: HttpRequest.Methods.POST,
      headers: this.getHeadersWithTraceId(),
      body,
      timeout: this.timeout,
      json: true,
    });
    log.save('send-message-by-user-ids-notifier-service-response', response);

    return response;
  }

  async importMessageTemplates({ dataToImport, rewriteTemplateIds }) {
    return HttpRequest.send({
      url: `${this.server}:${this.port}/import/template`,
      method: HttpRequest.Methods.POST,
      body: JSON.stringify({ dataToImport, rewriteTemplateIds }),
      headers: this.getHeadersWithTraceId(),
    });
  }

  getHeadersWithTraceId() {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }

  queryParamsToString(queryParams) {
    return encodeURI(
      Object.entries(queryParams)
        .filter((value) => typeof value[1] !== 'undefined')
        .map((value) => {
          if (Array.isArray(value[1])) {
            return querystring.stringify({ [value[0]]: value[1] }, null, '[]=');
          } else if (typeof value[1] === 'object' && value[0] === 'filters') {
            return Object.keys(value[1])
              .map(function (key) {
                return `filters[${key}]=${value[1][key]}`;
              })
              .join('&');
          } else if (typeof value[1] === 'object' && value[0] === 'sort') {
            return Object.keys(value[1])
              .map(function (key) {
                return `sort[${key}]=${value[1][key]}`;
              })
              .join('&');
          } else if (typeof value[1] === 'object') {
            return `${value[0]}=${JSON.stringify(value[1])}`;
          }

          return `${value[0]}=${value[1]}`;
        })
        .join('&'),
    );
  }
}

module.exports = NotifierService;
