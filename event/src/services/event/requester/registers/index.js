const LiquioProvider = require('./providers/liquio');

/**
 * Registers requester.
 */
class RegistersRequester {
  constructor(config) {
    // Define singleton.
    if (!RegistersRequester.singleton) {
      this.provider = new RegistersRequester.ProvidersList[config.provider](config);
      RegistersRequester.singleton = this;
    }
    return RegistersRequester.singleton;
  }

  /**
   * Get providers list.
   * @returns {{ liquio: LiquioProvider }} Providers list.
   */
  static get ProvidersList() {
    return { liquio: LiquioProvider };
  }

  /**
   * Save records to csv.
   * @param {object} data Data.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async saveRecordsToCsv(data, eventContext) {
    return await this.provider.saveRecordsToCsv(data, eventContext);
  }

  /**
   * Get records.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} data.path Path.
   * @param {string} data.name Name.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object[]>} Get records handling.
   */
  async getRecords(data, eventContext) {
    return await this.provider.getRecords(data, eventContext);
  }

  /**
   * Count records.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} data.path Path.
   * @param {string} data.name Name.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<number>} Get the number of records.
   */
  async countRecords(data, eventContext) {
    return await this.provider.countRecords(data, eventContext);
  }

  /**
   * @param {Object} queryParams
   * @param {Object} body
   * @return {Promise<Object>}
   */
  async findRecords(queryParams, body) {
    return await this.provider.findRecords(queryParams, body);
  }

  /**
   * Create record.
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>} Create record handling.
   */
  async createRecord(record, eventContext) {
    return await this.provider.createRecord(record, eventContext);
  }

  /**
   * Update record.
   * @param {string} id ID.
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>} Update record handling.
   */
  async updateRecord(id, record, eventContext) {
    return await this.provider.updateRecord(id, record, eventContext);
  }

  /**
   * Delete record.
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>} Delete record handling.
   */
  async deleteRecord(id, eventContext) {
    return await this.provider.deleteRecord(id, eventContext);
  }

  /**
   * Get register key ID.
   * @param {string} id  Register key ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>} Get key id handling.
   */
  async getKeyById(id, eventContext) {
    return await this.provider.getKeyById(id, eventContext);
  }

  /**
   * Send ping request.
   * @returns {Promise<object>} Send ping request result.
   */
  async sendPingRequest() {
    return await this.provider.sendPingRequest();
  }
}

module.exports = RegistersRequester;
