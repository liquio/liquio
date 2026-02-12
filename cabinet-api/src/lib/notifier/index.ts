import HttpRequest from '../http_request';
import { getTraceId } from '../async_local_storage';

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

interface QueryParams {
  start?: string;
  count?: string;
  filters?: { is_read?: string };
  sort?: { date?: string };
  search?: string;
  from_created_at?: string;
  to_created_at?: string;
}

/**
 * Notifier service.
 */
export default class Notifier {
  server: string;
  port: number;
  user: string;
  routes: typeof ROUTES;
  hashedPassword: string;
  headers: Record<string, string>;
  timeout: number;
  static singleton: Notifier;

  /**
   * Notifier constructor.
   */
  constructor() {
    // Define singleton.
    if (!Notifier.singleton) {
      this.server = global.config.notifier.server;
      this.port = global.config.notifier.port;
      this.user = global.config.notifier.user;
      this.routes = { ...ROUTES, ...(global.config.notifier.routes || {}) };
      this.hashedPassword = global.config.notifier.hashedPassword;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${this.user}:${this.hashedPassword}`,
      };
      this.timeout = global.config.notifier.timeout || 30000;
      Notifier.singleton = this;
    }

    // Return singleton.
    return Notifier.singleton;
  }

  /**
   * Get messages.
   * @param accessToken Access token.
   * @param eventId Event ID.
   * @param queryParams Query params.
   * @returns Promise of messages.
   */
  async getMessages(accessToken: string, eventId?: number, queryParams?: QueryParams): Promise<any> {
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
      const messageQueryParams = `?access_token=${accessToken}&needEmails=true&showAll=true${eventIdQueryParam}${paginationQueryParams}${isReadQueryParam}${orderByDateQueryParam}${searchQueryParam}${fromCreatedAtQueryParam}${toCreatedAtQueryParam}`;
      const url = `${this.server}:${this.port}${ROUTES.getMessages}${messageQueryParams}`;
      global.log.save('get-message-list-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      global.log.save('get-message-list-response', response);

      const data = {
        data: response.result,
        meta: response.meta,
      };

      return data;
    } catch (error: any) {
      global.log.save('get-message-list-error', error.message);
    }
  }

  /**
   * Set message state is read.
   * @param accessToken Access token.
   * @param messageId Message ID.
   * @returns Promise of response.
   */
  async setMessageStateIsRead(accessToken: string, messageId: number): Promise<any> {
    try {
      const messageQueryParams = `?access_token=${accessToken}&messages=${messageId}`;
      const url = `${this.server}:${this.port}${ROUTES.getMessages}/is_read${messageQueryParams}`;
      global.log.save('set-message-state-isread-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      global.log.save('set-message-state-isread-response', response);

      return response;
    } catch (error: any) {
      global.log.save('set-message-state-isread-error', error.message);
    }
  }

  /**
   * Get important messages.
   * @param accessToken Access token.
   * @returns Promise of important messages.
   */
  async getImportantMessages(accessToken: string): Promise<any[]> {
    try {
      // Prepare params.
      const messageQueryParams = `?access_token=${accessToken}`;
      const url = `${this.server}:${this.port}${ROUTES.getImportantMessages}${messageQueryParams}`;
      global.log.save('get-important-messages-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      global.log.save('get-important-messages-response', response);

      return (response && response.data) || [];
    } catch (error: any) {
      global.log.save('get-important-messages-error', {
        error: (error && error.message) || error,
      });
      return [];
    }
  }

  /**
   * Hide important message.
   * @param accessToken Access token.
   * @param messageId Message ID.
   * @returns Promise of response.
   */
  async hideImportantMessage(accessToken: string, messageId: number): Promise<any> {
    try {
      // Prepare params.
      const route = ROUTES.hideImportantMessage.replace(MESSAGE_ID_KEY, messageId.toString());
      const messageQueryParams = `?access_token=${accessToken}&messages=${messageId}&strict_allow_hide=true`;
      const url = `${this.server}:${this.port}${route}${messageQueryParams}`;
      global.log.save('hide-important-message-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        timeout: this.timeout,
      });
      global.log.save('hide-important-message-response', response);

      return (response && response.data) || response;
    } catch (error: any) {
      global.log.save('hide-important-message-error', {
        error: (error && error.message) || error,
        messageId,
      });
      throw error;
    }
  }

  /**
   * Decrypt.
   * @param accessToken Access token.
   * @param messageId Message ID.
   * @param decryptedBase64 Decrypted BASE64 text.
   * @returns Promise of decrypted message.
   */
  async decrypt(accessToken: string, messageId: number, decryptedBase64: string): Promise<any> {
    try {
      // Prepare params.
      const route = ROUTES.decrypt.replace(MESSAGE_ID_KEY, messageId.toString());
      const messageQueryParams = `?access_token=${accessToken}&messages=${messageId}`;
      const url = `${this.server}:${this.port}${route}${messageQueryParams}`;
      global.log.save('decrypt-request', url);

      // Do request.
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.PUT,
        headers: this.getHeadersWithTraceId(),
        body: JSON.stringify({ decryptedBase64 }),
        timeout: this.timeout,
      });
      global.log.save('decrypt-response', response);

      return (response && response.data) || response;
    } catch (error: any) {
      global.log.save('decrypt-error', {
        error: (error && error.message) || error,
        messageId,
        decryptedBase64,
      });
    }
  }

  /**
   * Get count unread messages.
   * @param accessToken Access token.
   * @param userId User ID.
   * @returns Promise of response.
   */
  async getCountUnreadMessages(accessToken: string, userId: string): Promise<any> {
    try {
      const messageQueryParams = accessToken ? `?access_token=${accessToken}` : `?user_id=${userId}`;
      const url = `${this.server}:${this.port}${ROUTES.getCountUnreadMessages}${messageQueryParams}`;
      global.log.save('get-count-unread-messages-request', url);

      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.GET,
        headers: { 'x-trace-id': getTraceId() },
        timeout: this.timeout,
      });
      global.log.save('get-count-unread-messages-response', response);

      return response;
    } catch (error: any) {
      global.log.save('get-count-unread-messages-error', error.message);
    }
  }

  /**
   * Send ping request.
   * @returns Promise of ping response.
   */
  async sendPingRequest(): Promise<any> {
    const fullResponse = true;

    try {
      const responseData = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${(this.routes as any).ping}_with_auth`,
          method: HttpRequest.Methods.GET,
          headers: this.getHeadersWithTraceId(),
          timeout: this.timeout,
        },
        fullResponse,
      );
      global.log.save('send-ping-request-to-notify', responseData);
      const body = responseData && responseData.body;
      const headers = responseData && responseData.response && responseData.response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;

      return { version, customer, environment, body };
    } catch (error: any) {
      global.log.save('send-ping-request-to-notify', error.message);
    }
  }

  /**
   * Send to user.
   * @param to Recipient ID or IDs list.
   * @param subject Subject.
   * @param html HTML body.
   * @param templateId Template ID.
   * @returns Promise of send result.
   */
  async sendToUser(to: string | string[], subject: string, html: string, templateId: number): Promise<boolean> {
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
        url: `${this.server}:${this.port}${(this.routes as any).sendToUserList}`,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
        timeout: this.timeout,
      };
      global.log.save('sending-to-user-request', { body, requestOptions });
      response = await HttpRequest.send(requestOptions);
      global.log.save('sending-to-user-response', response);
    } catch (error: any) {
      global.log.save('sending-to-user-error', error.message);
    }

    return response && response.sendByEmail && response.sendByEmail.length ? true : false;
  }

  /**
   * Send by emails.
   * @param emailsList Emails list.
   * @param subject Subject.
   * @param message Message.
   * @param templateId Template ID.
   * @returns Promise of send result.
   */
  async sendByEmails(emailsList: string | string[], subject: string, message: string, templateId: number): Promise<{ response: any }> {
    const finalEmailsList = Array.isArray(emailsList) ? emailsList : [emailsList];
    try {
      // Define request body.
      const bodyObject = {
        list_email: finalEmailsList,
        title_message: subject,
        full_message: message,
        template_id: templateId,
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const url = `${this.server}:${this.port}${(this.routes as any).sendToUserEmails}`;
      global.log.save('notifier-email-sending-request', { url, body }, 'info');
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
        timeout: this.timeout,
      });
      global.log.save('notifier-email-sending-response', response, 'info');
      return {
        response,
      };
    } catch (error: any) {
      global.log.save('system-notifier-email-sending-error', error.message, 'error');
      throw error;
    }
  }

  /**
   * Get headers with trace ID.
   * @returns Headers object.
   */
  private getHeadersWithTraceId(): Record<string, string> {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }
}
