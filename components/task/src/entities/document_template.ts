import * as jsoncParser from 'jsonc-parser';
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
  taskTemplate: any; // Assigned externally by models/document_template.ts's getAll.

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

  getFilterProperties() {
    return ['id', 'name', 'jsonSchema', 'htmlTemplate', 'accessJsonSchema', 'taskTemplate', 'additionalDataToSign'];
  }

  getFilterPropertiesBrief() {
    return ['id', 'name', 'taskTemplate'];
  }

  /**
   * HTML templates.
   * @returns {string[]} HTML templates list.
   */
  get htmlTemplates() {
    // Check if not exist.
    if (typeof this.htmlTemplate !== 'string') {
      return [];
    }

    // Separate by delimiter and return.
    const { htmlTemplateDelimiter } = global.config.file_generator;
    const htmlTemplates = this.htmlTemplate.split(htmlTemplateDelimiter);
    return htmlTemplates;
  }

  /**
   * Has many HTML templates.
   * @returns {boolean} Has many HTML templates indicator.
   */
  get hasManyHtmlTemplates() {
    // Define if document template contains many HTML templates and return.
    const hasManyHtmlTemplates = this.htmlTemplates.length > 1;
    return hasManyHtmlTemplates;
  }
}
