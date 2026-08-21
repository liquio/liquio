const LiquioProvider = require('./providers/liquio');

/**
 * Email notifier.
 */
class EmailNotifier {
  constructor(config) {
    // Define singleton.
    if (!EmailNotifier.singleton) {
      this.provider = new EmailNotifier.ProvidersList[config.provider](config);
      EmailNotifier.singleton = this;
    }

    return EmailNotifier.singleton;
  }

  /**
   * Get providers list.
   */
  static get ProvidersList() {
    return { liquio: LiquioProvider };
  }

  /**
   * Send email.
   * @param {string|string[]} to Recipient email or email list.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} [templateId] Template ID.
   * @param {boolean} [sendToCabinetOnly] Send only to cabinet boolean flag.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {object}
   */
  async send(to, subject, html, templateId, sendToCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext) {
    return await this.provider.send(to, subject, html, templateId, sendToCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext);
  }

  /**
   * Hide important messages.
   * @param {object[]} messages Messages.
   * @returns {object}
   */
  async hideImportantMessages(messages) {
    return await this.provider.hideImportantMessages(messages);
  }

  /**
   *
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    return await this.provider.sendPingRequest();
  }
}

module.exports = EmailNotifier;
