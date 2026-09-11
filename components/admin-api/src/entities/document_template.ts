import { Entity } from './entity';

interface DocumentTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** JSON schema. */
  jsonSchema: object;
  /** JSON schema raw. */
  jsonSchemaRaw: string;
  /** Template data. */
  htmlTemplate: string;
  /** Inboxes JSON schema. */
  accessJsonSchema: object;
  /** Additional data to sign. */
  additionalDataToSign: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  taskTemplate?: object;
}

/**
 * Document template entity.
 */
export class DocumentTemplateEntity extends Entity<DocumentTemplateEntityOptions> {
  getFilterProperties(): (keyof DocumentTemplateEntityOptions)[] {
    return ['id', 'name', 'jsonSchema', 'htmlTemplate', 'accessJsonSchema', 'taskTemplate', 'additionalDataToSign'];
  }

  getFilterPropertiesBrief(): (keyof DocumentTemplateEntityOptions)[] {
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

export interface DocumentTemplateEntity extends DocumentTemplateEntityOptions {}
