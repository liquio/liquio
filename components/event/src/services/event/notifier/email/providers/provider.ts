import { ERROR_OVERRIDE } from '../../../../../constants/error';
import { Sandbox } from '@liquio/back-core';

/**
 * Email provider.
 * @interface
 */
export class Provider {
  sandbox: Sandbox;
  templateParams: Record<string, any>;

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

  async send(
    _to: string | string[],
    _subject: any,
    _html: any,
    _templateId?: number,
    _sendToCabinetOnly?: boolean,
    _messageCryptTypeId?: number,
    _importantMessage?: any,
  ): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Hide important messages.
   * @abstract
   * @param {object[]} messages Messages.
   */

  async hideImportantMessages(_messages: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Template to text.
   * @param {string} template Template. Sample: `Check task "{{frontUrl}}/tasks/22a6bf70-7b0f-11e9-acbd-e363b5f9f9f3".`.
   * @returns {string} Text. Sample: `Check task "https://front-dev-oe.liquio.local/tasks/22a6bf70-7b0f-11e9-acbd-e363b5f9f9f3".`.
   */
  templateToText(template: any): any {
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
