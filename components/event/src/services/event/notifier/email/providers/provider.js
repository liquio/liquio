const { ERROR_OVERRIDE } = require('../../../../../constants/error');
const Sandbox = require('../../../../../lib/sandbox');

/**
 * Email provider.
 * @interface
 */
class Provider {
  constructor() {
    this.sandbox = Sandbox.getInstance();
  }

  /**
   * Send.
   * @abstract
   * @param {string|string[]} to Recipient email or email list. User ID can be used instead email.
   * @param {object} subject Subject.
   * @param {object} html HTML body.
   * @param {number} [templateId] Template ID.
   * @param {boolean} [sendToCabinetOnly] Send to cabinet only.
   * @param {number} [messageCryptTypeId] Message crypt type ID.
   * @param {object} [importantMessage] Important message.
   */
  /* eslint-disable-next-line no-unused-vars */
  async send(to, subject, html, templateId, sendToCabinetOnly, messageCryptTypeId, importantMessage) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Hide important messages.
   * @abstract
   * @param {object[]} messages Messages.
   */
  /* eslint-disable-next-line no-unused-vars */
  async hideImportantMessages(messages) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Template to text.
   * @param {string} template Template. Sample: `Check task "{{frontUrl}}/tasks/22a6bf70-7b0f-11e9-acbd-e363b5f9f9f3".`.
   * @returns {string} Text. Sample: `Check task "https://front-dev-oe.liquio.local/tasks/22a6bf70-7b0f-11e9-acbd-e363b5f9f9f3".`.
   */
  templateToText(template) {
    // Check.
    if (typeof template !== 'string') {
      return template;
    }

    // Text container.
    let text = template;

    // Check all template params. Sample: `{ frontUrl: 'https://front-dev-oe.liquio.local' }`.
    for (const templateParamKey in this.templateParams) {
      // Define params.
      const templateParamValue = this.templateParams[templateParamKey];
      const templateParamReplaceKey = `{{${templateParamKey}}}`;

      // Replace.
      text = text.replace(new RegExp(templateParamReplaceKey, 'g'), templateParamValue);
    }

    // Return text.
    return text;
  }
}

module.exports = Provider;
