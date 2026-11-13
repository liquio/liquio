import { BlockchainRequester } from './blockchain';
import { RegistersRequester } from './registers';
import { ExternalServiceRequester } from './external_service';
import { DocumentRequester } from './document';
import { ServicesRepositoryRequester } from './services_repository';

/**
 * Event requester.
 */
export class EventRequester {
  static singleton: EventRequester;

  blockchainRequester: BlockchainRequester;

  registersRequester: RegistersRequester;

  externalServiceRequester: ExternalServiceRequester;

  documentRequester: DocumentRequester;

  servicesRepositoryRequester: ServicesRepositoryRequester;

  /**
   * Constructor.
   * @param {object} config Config.
   * @property {object} config.blockchain Blockchain config.
   */
  constructor(config: any) {
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
  async get(data: any, type: any, eventContext?: any): Promise<any> {
    switch (type) {
      case 'registers':
        return await this.registersRequester.getRecords(data, eventContext);
      case 'registersCount':
        return await this.registersRequester.countRecords(data, eventContext);
      case 'registerKeys':
        return await this.registersRequester.getKeyById(data, eventContext);
      case 'document':
        return await (this.documentRequester.get as any)(data, eventContext);
      case 'externalService':
        return await (this.externalServiceRequester.send as any)(data, eventContext);
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
  async create(data: any, type: any, eventContext?: any): Promise<any> {
    switch (type) {
      case 'blockchain':
        return await (this.blockchainRequester.register as any)(data, eventContext);
      case 'registers':
        return await this.registersRequester.createRecord(data, eventContext);
      case 'saveRegisterRecordsToCsv':
        return await this.registersRequester.saveRecordsToCsv(data, eventContext);
      case 'externalService':
        return await (this.externalServiceRequester.send as any)(data, eventContext);
      case 'document':
        return await (this.documentRequester.download as any)(data, eventContext);
      case 'servicesRepository':
        return await (this.servicesRepositoryRequester.save as any)(data, eventContext);
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
  async update(id: any, data: any, type: any, eventContext?: any): Promise<any> {
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
  async delete(id: any, type: any, eventContext?: any): Promise<any> {
    switch (type) {
      case 'registers':
        return await this.registersRequester.deleteRecord(id, eventContext);
      default:
        throw new Error('Wrong requester type.');
    }
  }
}
