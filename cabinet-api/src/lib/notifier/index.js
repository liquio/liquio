const HttpRequest = require('../http_request');
const { getTraceId } = require('../async_local_storage');

// Constants.
const ROUTES = {
  getMessages: '/message',
  getCountUnreadMessages: '/message/unread',
  sendToUserList: '/message/usersList',
  sendToUserEmails: '/message/emailsList',
  decrypt: '/message/<message-id>/decrypt',
  getImportantMessages: '/message/important',
  hideImportantMessage: '/message/important/<message-id>/set-unimportant',
};
const MESSAGE_ID_KEY = '<message-id>';

/**
 * Notifier service.
 */
class Notifier {
  /**
   * Notifier constructor.
   */
  constructor() {
    // Define singleton.
    if (!Notifier.singleton) {
      this.server = config.notifier.server;
      this.port = config.notifier.port;
      this.user = config.notifier.user;
      this.routes = { ...ROUTES, ...(config.notifier.routes || {}) };
      this.hashedPassword = config.notifier.hashedPassword;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${this.user}:${this.hashedPassword}`,
      };
      this.timeout = config.notifier.timeout || 30000;
      Notifier.singleton = this;
    }

    // Return singleton.
    return Notifier.singleton;
  }

  /**
   * Get messages.
   * @param {string} accessToken Access token.
   * @param {number} [eventId] Event ID.
   * @param {object} [queryParams] Query params.
   * @returns {Promise<object[]>}
   */
  async getMessages(accessToken, eventId, queryParams) {
    const paginationQueryParams =
      queryParams && queryParams.start && queryParams.count && !isNaN(parseInt(queryParams.start)) && !isNaN(parseInt(queryParams.count))
        ? `&start=${queryParams.start}&count=${queryParams.count}`
        : '';
    const isReadQueryParam =
      queryParams && queryParams.filters && queryParams.filters.is_read && !isNaN(parseInt(queryParams.filters.is_read))
        ? `&is_read=${queryParams.filters.is_read}`
        : '';
    const orderByDateQueryParam = queryParams && queryParams.sort && queryParams.sort.date ? `&order_date=${queryParams.sort.date}` : '';
    const searchQueryParam = queryParams && queryParams.search ? `&search=${encodeURIComponent(queryParams.search)}` : '';
    const fromCreatedAtQueryParam =
      queryParams && queryParams.from_created_at ? `&from_created_at=${encodeURIComponent(queryParams.from_created_at)}` : '';
    const toCreatedAtQueryParam = queryParams && queryParams.to_created_at ? `&to_created_at=${encodeURIComponent(queryParams.to_created_at)}` : '';

    try {
      // Do request to get message list.
      const eventIdQueryParam = typeof eventId === 'number' ? `&event_id=${eventId}` : '';
      const queryParams = `?access_token=${accessToken}&needEmails=true&showAll=true${eventIdQueryParam}${paginationQueryParams}${isReadQueryParam}${orderByDateQueryParam}${searchQueryParam}${fromCreatedAtQueryParam}${toCreatedAtQueryParam}`;
      const url = `${this.server}:${this.port}${ROUTES.getMessages}${queryParams}`;
      log.save('get-message-list-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      log.save('get-message-list-response', response);

      const data = {
        data: response.result,
        meta: response.meta,
      };

      return data;
    } catch (error) {
      log.save('get-message-list-error', error.message);
    }
  }

  /**
   * Set message state is read.
   * @param {string} accessToken Access token.
   * @returns {Promise<{}[]>}
   */
  async setMessageStateIsRead(accessToken, messageId) {
    try {
      const queryParams = `?access_token=${accessToken}&messages=${messageId}`;
      const url = `${this.server}:${this.port}${ROUTES.getMessages}/is_read${queryParams}`;
      log.save('set-message-state-isread-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      log.save('set-message-state-isread-response', response);

      return response;
    } catch (error) {
      log.save('set-message-state-isread-error', error.message);
    }
  }

  /**
   * Get important messages.
   * @param {string} accessToken Access token.
   * @returns {Promise<object[]>}
   */
  async getImportantMessages(accessToken) {
    try {
      // Prepare params.
      const queryParams = `?access_token=${accessToken}`;
      const url = `${this.server}:${this.port}${ROUTES.getImportantMessages}${queryParams}`;
      log.save('get-important-messages-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      log.save('get-important-messages-response', response);

      return (response && response.data) || [];
    } catch (error) {
      log.save('get-important-messages-error', { error: (error && error.message) || error });
    }
  }

  /**
   * Hide important message.
   * @param {string} accessToken Access token.
   * @param {number} messageId Message ID.
   * @returns {Promise<object>}
   */
  async hideImportantMessage(accessToken, messageId) {
    try {
      // Prepare params.
      const route = ROUTES.hideImportantMessage.replace(MESSAGE_ID_KEY, messageId);
      const queryParams = `?access_token=${accessToken}&messages=${messageId}&strict_allow_hide=true`;
      const url = `${this.server}:${this.port}${route}${queryParams}`;
      log.save('hide-important-message-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      log.save('hide-important-message-response', response);

      return (response && response.data) || response;
    } catch (error) {
      log.save('hide-important-message-error', { error: (error && error.message) || error, messageId });
      throw error;
    }
  }

  /**
   * Decrypt.
   * @param {string} accessToken Access token.
   * @param {number} messageId Message ID.
   * @param {string} decryptedBase64 Decrypted BASE64 text.
   * @returns {Promise<{}>} Decrypted message promise.
   */
  async decrypt(accessToken, messageId, decryptedBase64) {
    try {
      // Prepare params.
      const route = ROUTES.decrypt.replace(MESSAGE_ID_KEY, messageId);
      const queryParams = `?access_token=${accessToken}&messages=${messageId}`;
      const url = `${this.server}:${this.port}${route}${queryParams}`;
      log.save('decrypt-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        body: JSON.stringify({ decryptedBase64 }),
        timeout: this.timeout,
      });
      log.save('decrypt-response', response);

      return (response && response.data) || response;
    } catch (error) {
      log.save('decrypt-error', { error: (error && error.message) || error, messageId, decryptedBase64 });
    }
  }

  /**
   * Get count unread messages.
   * @param {string} accessToken Access token.
   * @param {string} userId User ID.
   * @returns {Promise<{}[]>}
   */
  async getCountUnreadMessages(accessToken, userId) {
    try {
      const queryParams = accessToken ? `?access_token=${accessToken}` : `?user_id=${userId}`;
      const url = `${this.server}:${this.port}${ROUTES.getCountUnreadMessages}${queryParams}`;
      log.save('get-count-unread-messages-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: { 'x-trace-id': getTraceId() },
        timeout: this.timeout,
      });
      log.save('get-count-unread-messages-response', response);

      return response;
    } catch (error) {
      log.save('get-count-unread-messages-error', error.message);
    }
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
      log.save('send-ping-request-to-notify', responseData);
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

  /**
   * Send to user.
   * @param {string|string[]} to Recipient ID or IDs list.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} templateId Template ID.
   */
  async sendToUser(to, subject, html, templateId) {
    let response;
    try {
      // Define request body.
      const bodyObject = {
        list_user_id: Array.isArray(to) ? to : [to],
        title_message: subject,
        full_message: html,
        template_id: templateId,
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const requestOptions = {
        url: `${this.server}:${this.port}${this.routes.sendToUserList}`,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
        timeout: this.timeout,
      };
      log.save('sending-to-user-request', { body, requestOptions });
      response = await HttpRequest.send(requestOptions);
      log.save('sending-to-user-response', response);
    } catch (error) {
      log.save('sending-to-user-error', error.message);
    }

    return response && response.sendByEmail && response && response.sendByEmail.length ? true : false;
  }

  /**
   * Send by emails.
   * @returns {object}
   */
  async sendByEmails(emailsList, subject, message, templateId) {
    emailsList = Array.isArray(emailsList) ? emailsList : [emailsList];
    try {
      // Define request body.
      const bodyObject = {
        list_email: emailsList,
        title_message: subject,
        full_message: message,
        template_id: templateId,
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const url = `${this.server}:${this.port}${this.routes.sendToUserEmails}`;
      log.save('notifier-email-sending-request', { url, body }, 'info');
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
        timeout: this.timeout,
      });
      log.save('notifier-email-sending-response', response, 'info');
      return {
        response,
      };
    } catch (error) {
      log.save('system-notifier-email-sending-error', error.message, 'error');
      throw error;
    }
  }

  getHeadersWithTraceId() {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }
}

module.exports = Notifier;
