const EmailNotifier = require('./email');
const SmsNotifier = require('./sms');
const DigestNotifier = require('./digest');

/**
 * Event notifier.
 */
class EventNotifier {
  /**
   * Constructor.
   * @param {object} config Config.
   */
  constructor(config) {
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
  async sendEmail(to, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext) {
    return await this.emailNotifier.send(to, subject, html, templateId, toCabinetOnly, messageCryptTypeId, importantMessage, sender, eventContext);
  }

  /**
   * Send sms.
   * @param {string|string[]} phones Phones.
   * @param {string} message Message.
   * @param {string} translitMessage Translit message.
   * @returns {object}
   */
  async sendSms(phones, message, translitMessage) {
    return await this.smsNotifier.send(phones, message, translitMessage);
  }

  /**
   * Send email.
   * @param {string|string[]} emailsSubscribeToDigest Recipient email or email list.
   * @returns {object[]}
   */
  async sendToDigest(emailsSubscribeToDigest) {
    return await this.digestNotifier.send(emailsSubscribeToDigest);
  }

  /**
   * Hide important messages.
   * @param {object[]} messages Messages.
   * @returns {object[]}
   */
  async hideImportantMessages(messages) {
    return await this.emailNotifier.hideImportantMessages(messages);
  }
}

module.exports = EventNotifier;
