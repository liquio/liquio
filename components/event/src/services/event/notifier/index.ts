import { EmailNotifier } from './email';
import { SmsNotifier } from './sms';
import { DigestNotifier } from './digest';

/**
 * Event notifier.
 */
export class EventNotifier {
  static singleton: EventNotifier;

  emailNotifier: EmailNotifier;

  smsNotifier: SmsNotifier;

  digestNotifier: DigestNotifier;

  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config: any) {
    // Define singleton.
    if (!EventNotifier.singleton) {
      this.emailNotifier = new EmailNotifier(config.email);
      this.smsNotifier = new SmsNotifier(config.sms);
      this.digestNotifier = new DigestNotifier(config.digest || {});

      EventNotifier.singleton = this;
    }

    return EventNotifier.singleton;
  }

  /**
   * Send email.
   * @param {string|string[]} to Recipient email or email list.
   * @param {string} subject Subject.
   * @param {string} html HTML body.
   * @param {number} [templateId] Template ID.
   * @param {boolean} [toCabinetOnly] Send only to cabinet boolean flag.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   * @param {string} [sender] Sender.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {object[]}
   */
  async sendEmail(
    to: any,
    subject: any,
    html: any,
    templateId?: any,
    toCabinetOnly?: any,
    messageCryptTypeId?: any,
    importantMessage?: any,
    sender?: any,
    eventContext?: any,
  ): Promise<any> {
    return await this.emailNotifier.send(to, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext);
  }

  /**
   * Send sms.
   * @param {string|string[]} phones Phones.
   * @param {string} message Message.
   * @param {string} translitMessage Translit message.
   * @returns {object}
   */
  async sendSms(phones: any, message: any, translitMessage: any): Promise<any> {
    return await this.smsNotifier.send(phones, message, translitMessage);
  }

  /**
   * Send email.
   * @param {string|string[]} emailsSubscribeToDigest Recipient email or email list.
   * @returns {object[]}
   */
  async sendToDigest(emailsSubscribeToDigest: any): Promise<any> {
    return await this.digestNotifier.send(emailsSubscribeToDigest);
  }

  /**
   * Hide important messages.
   * @param {object[]} messages Messages.
   * @returns {object[]}
   */
  async hideImportantMessages(messages: any): Promise<any> {
    return await this.emailNotifier.hideImportantMessages(messages);
  }
}
