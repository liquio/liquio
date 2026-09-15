import { LiquioProvider } from './providers/liquio';

/**
 * Email notifier.
 */
export class EmailNotifier {
  static singleton: EmailNotifier;

  provider: LiquioProvider;

  constructor(config: any) {
    // Define singleton.
    if (!EmailNotifier.singleton) {
      this.provider = new (EmailNotifier.ProvidersList as any)[config.provider](config);
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
  async send(
    to: string | string[],
    subject: string,
    html: string,
    templateId?: number,
    sendToCabinetOnly?: boolean,
    messageCryptTypeId?: number,
    importantMessage?: any,
    sender?: string,
    eventContext?: any,
  ): Promise<any> {
    return await this.provider.send(to, subject, html, templateId, sendToCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext);
  }

  /**
   * Hide important messages.
   * @param {object[]} messages Messages.
   * @returns {object}
   */
  async hideImportantMessages(messages: any[]): Promise<any> {
    return await this.provider.hideImportantMessages(messages);
  }

  /**
   *
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    return await this.provider.sendPingRequest();
  }
}
