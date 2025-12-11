const BlockchainRequester = require('./blockchain');
const RegistersRequester = require('./registers');
const ExternalServiceRequester = require('./external_service');
const DocumentRequester = require('./document');
const ServicesRepositoryRequester = require('./services_repository');

/**
 * Event requester.
 */
class EventRequester {
  /**
   * Constructor.
   * @param {object} config Config.
   * @property {object} config.blockchain Blockchain config.
   */
  constructor(config) {
    // Define singleton.
    if (!EventRequester.singleton) {
      this.blockchainRequester = new BlockchainRequester(config.blockchain);
      this.registersRequester = new RegistersRequester(config.registers);
      this.externalServiceRequester = new ExternalServiceRequester(config.externalService, config.registers);
      this.documentRequester = new DocumentRequester(config.document);
      this.servicesRepositoryRequester = new ServicesRepositoryRequester(config.servicesRepository);
      EventRequester.singleton = this;
    }

    return EventRequester.singleton;
  }

  /**
   * Handle get API endpoint (e.g. GET /api)
   * @param {object} data Data.
   * @param {'registers'|'registerKeys'|'document'} type Requester type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<void>} Promise.
   */
  async get(data, type, eventContext) {
    switch (type) {
      case 'registers':
        return await this.registersRequester.getRecords(data, eventContext);
      case 'registersCount':
        return await this.registersRequester.countRecords(data, eventContext);
      case 'registerKeys':
        return await this.registersRequester.getKeyById(data, eventContext);
      case 'document':
        return await this.documentRequester.get(data, eventContext);
      case 'externalService':
        return await this.externalServiceRequester.send(data, eventContext);
      default:
        throw new Error('Wrong requester type.');
    }
  }

  /**
   * Handle create API endpoint (e.g. POST /api)
   * @param {object} data Data to save.
   * @param {'blockchain'|'registers'|'externalService'|'document'|'servicesRepository'} type Requester type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<void>} Promise.
   */
  async create(data, type, eventContext) {
    switch (type) {
      case 'blockchain':
        return await this.blockchainRequester.register(data, eventContext);
      case 'registers':
        return await this.registersRequester.createRecord(data, eventContext);
      case 'saveRegisterRecordsToCsv':
        return await this.registersRequester.saveRecordsToCsv(data, eventContext);
      case 'externalService':
        return await this.externalServiceRequester.send(data, eventContext);
      case 'document':
        return await this.documentRequester.download(data, eventContext);
      case 'servicesRepository':
        return await this.servicesRepositoryRequester.save(data, eventContext);
      default:
        throw new Error('Wrong requester type.');
    }
  }

  /**
   * Handle update API endpoint (e.g. PUT /api)
   * @param {string} id ID.
   * @param {object} data Data to save.
   * @param {'registers'} type Requester type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<void>} Promise.
   */
  async update(id, data, type, eventContext) {
    switch (type) {
      case 'registers':
        return await this.registersRequester.updateRecord(id, data, eventContext);
      default:
        throw new Error('Wrong requester type.');
    }
  }

  /**
   * Handle delete API endpoint (e.g. DELETE /api)
   * @param {string} id ID.
   * @param {'registers'} type Requester type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<void>} Promise.
   */
  async delete(id, type, eventContext) {
    switch (type) {
      case 'registers':
        return await this.registersRequester.deleteRecord(id, eventContext);
      default:
        throw new Error('Wrong requester type.');
    }
  }
}

module.exports = EventRequester;
