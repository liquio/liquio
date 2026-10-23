import * as jsoncParser from 'jsonc-parser';

import { Entity } from './entity';

/**
 * Constructor input for {@link DocumentTemplateEntity}. Note `jsonSchema` here is the raw,
 * unparsed JSON Schema *string* as stored in the DB - the constructor parses it into the object
 * the class field of the same name then holds (see that field's own comment).
 */
export interface DocumentTemplateEntityOptions {
  id: number;
  name?: string | null;
  jsonSchema?: string | null;
  htmlTemplate?: string | null;
  accessJsonSchema?: Record<string, unknown>;
  additionalDataToSign?: string | null;
}

/**
 * Document template entity.
 */
export class DocumentTemplateEntity extends Entity {
  id: number;
  name: string | null;
  /**
   * Parsed JSON Schema - an arbitrary, user-authored document describing the template's steps/
   * controls. Left as `any` deliberately: modeling it precisely would mean typing a full JSON
   * Schema dialect, which nothing else in this codebase does either (see `models/document_template.ts`'s
   * `substituteJsonProps`, which walks this same structure).
   */
  jsonSchema: any;
  htmlTemplate: string | null;
  accessJsonSchema: Record<string, unknown>;
  additionalDataToSign: string | null;
  taskTemplate: any; // Assigned externally by models/document_template.ts's getAll.

  constructor({ id, name, jsonSchema, htmlTemplate, accessJsonSchema, additionalDataToSign }: DocumentTemplateEntityOptions) {
    super();

    this.id = id;
    this.name = name;
    this.jsonSchema = jsonSchema && jsoncParser.parse(jsonSchema);
    this.htmlTemplate = htmlTemplate;
    this.accessJsonSchema = accessJsonSchema;
    this.additionalDataToSign = additionalDataToSign;
  }

  getFilterProperties(): string[] {
    return ['id', 'name', 'jsonSchema', 'htmlTemplate', 'accessJsonSchema', 'taskTemplate', 'additionalDataToSign'];
  }

  getFilterPropertiesBrief(): string[] {
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
