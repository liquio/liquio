import jsoncParser from 'jsonc-parser';

import { Entity } from './entity';

/**
 * Document template entity.
 */
export class DocumentTemplateEntity extends Entity {
  id: any;
  name: any;
  jsonSchema: any;
  htmlTemplate: any;
  accessJsonSchema: any;
  additionalDataToSign: any;

  /**
   * Constructor.
   * @param {object} options Document template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.jsonSchema JSON schema.
   * @param {string} options.htmlTemplate Template data.
   * @param {object} options.accessJsonSchema Inboxes JSON schema.
   * @param {string} options.additionalDataToSign Additional data to sign.
   */
  constructor({ id, name, jsonSchema, htmlTemplate, accessJsonSchema, additionalDataToSign }: any) {
    super();

    this.id = id;
    this.name = name;
    this.jsonSchema = jsonSchema && jsoncParser.parse(jsonSchema);
    this.htmlTemplate = htmlTemplate;
    this.accessJsonSchema = accessJsonSchema;
    this.additionalDataToSign = additionalDataToSign;
  }
}
