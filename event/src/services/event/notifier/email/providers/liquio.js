const Provider = require('./provider');
const HttpRequest = require('../../../../../lib/http_request');
const { getTraceId } = require('../../../../../lib/async_local_storage');

const MESSAGE_ID_KEY = '<message-id>';
const MAX_LOG_LENGTH = 100e3 - 1000;

/**
 * Liquio provider.
 */
class LiquioProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config) {
    // Singleton.
    if (!LiquioProvider.singleton) {
      // Call parent constructor.
      super();

      // Save params.
      const { server, port, routes, timeout, user, hashedPassword, templateParams = {}, defaultTemplateId, clientId } = config;
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${user}:${hashedPassword}`,
      };
      Object.assign(this, { config, server, port, routes, timeout, user, hashedPassword, templateParams, defaultTemplateId, clientId, headers });

      // Init singleton.
      LiquioProvider.singleton = this;
    }

    // Return singleton.
    return LiquioProvider.singleton;
  }

  /**
   * Send email.
   * @param {string|string[]} to Recipient email or email list. User ID can be used instead email.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} [templateId] Template ID.
   * @param {boolean} [toCabinetOnly] Send to cabinet only.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @returns {object[]}
   */
  async send(to, subject, html, templateId = this.defaultTemplateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext) {
    // Define params.
    const toList = Array.isArray(to) ? to : [to];
    const emailsList = toList.filter((v) => typeof v === 'string' && v.indexOf('@') > 0);
    const usersList = toList.filter((v) => typeof v === 'string' && v.indexOf('@') === -1 && v.length === 24);
    const usersIpnList = toList.filter((v) => typeof v === 'string' && v.indexOf('@') === -1 && v.length !== 24);

    // Template to text.
    const subjectText = this.templateToText(subject);
    const htmlText = this.templateToText(html);

    // Prepare options.
    const { attachments } = await this.prepareOptions(eventContext);

    // Responses container.
    let responses = [];

    // Send async via emails if need it.
    if (emailsList.length > 0) {
      const response = await this.sendViaEmails(
        emailsList,
        subjectText,
        htmlText,
        templateId,
        toCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        attachments,
      );
      responses.push(response);
    }

    // Send async via user IDs if need it.
    if (usersList.length > 0) {
      const response = await this.sendViaUserIds(
        usersList,
        subjectText,
        htmlText,
        templateId,
        toCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        attachments,
      );
      responses.push(response);
    }

    // Send async via user ipn if need it.
    if (usersIpnList.length > 0) {
      const response = await this.sendViaUsersIpn(
        usersIpnList,
        subjectText,
        htmlText,
        templateId,
        toCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        attachments,
      );
      responses.push(response);
    }

    // Return responses list.
    return responses;
  }

  /**
   * Send email.
   * @param {string[]} emails Recipient emails list.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} templateId Template ID.
   * @param {boolean} [toCabinetOnly] Send only to cabinet boolean flag.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @param {{[p7sFileId]: 'string', [fileId]: 'string', name: 'string', contentType: 'string', fileContent: 'string'}[]} [attachments] Attachments.
   * @returns {object}
   */
  async sendViaEmails(emails, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, attachments) {
    try {
      // Define request body.
      const body = {
        list_email: emails,
        title_message: subject,
        full_message: html,
        template_id: templateId,
        not_send: toCabinetOnly ? toCabinetOnly : false,
        message_crypt_type_id: messageCryptTypeId,
        is_encrypted: !!messageCryptTypeId,
        ...importantMessage,
        sender,
        attachments,
        ...(typeof this.clientId !== 'undefined' && this.clientId !== '' && { client_id: this.clientId }),
      };

      // Do request to send emails.
      const url = `${this.server}:${this.port}${this.routes.sendEmail}`;
      log.save('email-sending-request', this.prepareToLog({ url, body }));
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      });
      log.save('email-sending-response', response);

      return {
        data: {
          ...body,
          attachments: Array.isArray(body.attachments) ? body.attachments.map((v) => ({ ...v, content: '***' })) : body.attachments,
        },
        response,
      };
    } catch (error) {
      log.save('email-sending-error', error.message);
      throw error;
    }
  }

  /**
   * Send via users IDs.
   * @param {string[]} userIds Recipient user IDs list.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} templateId Template ID.
   * @param {boolean} [toCabinetOnly] Send only to cabinet boolean flag.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @param {{[p7sFileId]: 'string', [fileId]: 'string', name: 'string', contentType: 'string', fileContent: 'string'}[]} [attachments] Attachments.
   * @returns {object}
   */
  async sendViaUserIds(userIds, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, attachments) {
    try {
      // Define request body.
      const body = {
        list_user_id: userIds,
        title_message: subject,
        full_message: html,
        template_id: templateId,
        not_send: toCabinetOnly ? toCabinetOnly : false,
        message_crypt_type_id: messageCryptTypeId,
        is_encrypted: !!messageCryptTypeId,
        ...importantMessage,
        sender,
        attachments,
        ...(typeof this.clientId !== 'undefined' && this.clientId !== '' && { client_id: this.clientId }),
      };

      // Do request to send emails.
      const url = `${this.server}:${this.port}${this.routes.sendToUser}`;
      log.save('email-sending-request', this.prepareToLog({ url, body }));
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      });
      log.save('email-sending-response', response);

      return {
        data: {
          ...body,
          attachments: Array.isArray(body.attachments) ? body.attachments.map((v) => ({ ...v, content: '***' })) : body.attachments,
        },
        response,
      };
    } catch (error) {
      log.save('email-sending-error', error.message);
      throw error;
    }
  }

  /**
   * Send via users ipn.
   * @param {string[]} usersIpn Recipient users ipn.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} templateId Template ID.
   * @param {boolean} [toCabinetOnly] Send only to cabinet boolean flag.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @param {{[p7sFileId]: 'string', [fileId]: 'string', name: 'string', contentType: 'string', fileContent: 'string'}[]} [attachments] Attachments.
   * @returns {object}
   */
  async sendViaUsersIpn(usersIpn, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, attachments) {
    try {
      // Define request body.
      const body = {
        list_user_ipn: usersIpn,
        title_message: subject,
        full_message: html,
        template_id: templateId,
        not_send: toCabinetOnly ? toCabinetOnly : false,
        message_crypt_type_id: messageCryptTypeId,
        is_encrypted: !!messageCryptTypeId,
        ...importantMessage,
        sender,
        attachments,
        ...(typeof this.clientId !== 'undefined' && this.clientId !== '' && { client_id: this.clientId }),
      };

      // Do request to send emails.
      const url = `${this.server}:${this.port}${this.routes.sendToUser}`;
      log.save('email-sending-request', this.prepareToLog({ url, body }));
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      });
      log.save('email-sending-response', response);

      return {
        data: {
          ...body,
          attachments: Array.isArray(body.attachments) ? body.attachments.map((v) => ({ ...v, content: '***' })) : body.attachments,
        },
        response,
      };
    } catch (error) {
      log.save('email-sending-error', error.message);
      throw error;
    }
  }

  /**
   * Hide important messages.
   * @param {string[]} messages Messages.
   * @returns {object[]}
   */
  async hideImportantMessages(messages) {
    try {
      let responses = [];
      for (const message of messages) {
        const url = `${this.server}:${this.port}${this.routes.hideImportantMessage}?user_id=${message.userId}`.replace(
          MESSAGE_ID_KEY,
          message.messageId,
        );
        log.save('hide-important-message-request', { url, message });
        const response = await HttpRequest.send({
          url,
          method: HttpRequest.Methods.PUT,
          headers: this.getHeadersWithTraceId(),
        });
        log.save('hide-important-message-response', response);

        responses.push(response);
      }

      return {
        data: messages,
        response: responses,
      };
    } catch (error) {
      log.save('hide-important-message-error', error.message);
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
          url: `${this.server}:${this.port}${this.routes.ping}`,
          method: HttpRequest.Methods.GET,
          headers: { 'x-trace-id': getTraceId() },
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

  /**
   * Prepare options.
   * @private
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async prepareOptions(eventContext = {}) {
    // Define params.
    const {
      eventTemplateJsonSchemaObject: { fileIds: fileIdsFunction, p7sFileIds: p7sFileIdsFunction } = {},
      documents,
      events,
      filestorage,
    } = eventContext;

    const fileIds = typeof fileIdsFunction === 'string' ? this.sandbox.evalWithArgs(
      fileIdsFunction,
      [documents, events],
      { meta: { fn: 'fileIds', caller: 'LiquioNotifier.getAttachments' } },
    ) : [];
    const p7sFileIds = typeof p7sFileIdsFunction === 'string' ? this.sandbox.evalWithArgs(
      p7sFileIdsFunction,
      [documents, events],
      { meta: { fn: 'p7sFileIds', caller: 'LiquioNotifier.getAttachments' } },
    ) : [];

    const attachments = await this.getAttachments(filestorage, fileIds, p7sFileIds);

    return {
      attachments,
    };
  }

  /**
   * Get attachments.
   * @private
   * @param {Filestorage} filestorage Filestorage service.
   * @param {string[]} fileIds File IDs list.
   * @param {string[]} p7sFileIds P7S file IDs list.
   * @returns {Promise<{name, contentType, fileContent}[]>} Files data.
   */
  async getAttachments(filestorage, fileIds, p7sFileIds) {
    // Attachments container.
    let attachments = [];

    // Get P7S files.
    for (const p7sFileId of p7sFileIds) {
      const p7sInfo = await filestorage.getFile(p7sFileId, true);
      const { name, fileContent } = p7sInfo;
      attachments.push({ p7sFileId: p7sFileId, filename: name, content: fileContent });
    }

    // Get files.
    for (const fileId of fileIds) {
      const { name, fileContent } = await filestorage.getFile(fileId);
      attachments.push({ fileId: fileId, filename: name, content: fileContent });
    }

    return attachments;
  }

  /**
   * Prepare to log.
   * @private
   * @param {object} options options.
   * @param {string} options.url Url.
   * @param {string} options.body Body.
   * @returns {object} Url and cut body.
   */
  prepareToLog({ url, body }) {
    const ending = '<...cut>';
    const bodyToLog = body.length > MAX_LOG_LENGTH ? body.substring(0, MAX_LOG_LENGTH - ending.length) + ending : body;
    return {
      url,
      body: bodyToLog,
    };
  }

  getHeadersWithTraceId() {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }
}

module.exports = LiquioProvider;
