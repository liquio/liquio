import { ERROR_OVERRIDE } from '../../../../../constants/error';

export class Provider {
  /**
   * Get records.
   * @abstract
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} data.path Path.
   * @param {string} data.name Name.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   */
  async getRecords(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create record.
   * @abstract
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   */
  async createRecord(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update record.
   * @abstract
   * @param {string} id ID.
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   */
  async updateRecord(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Delete record.
   * @abstract
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   */
  async deleteRecord(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }
}
