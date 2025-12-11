const Decorators = require('./decorators');
const Providers = require('./providers');
const Sandbox = require('../../../../lib/sandbox');

/**
 * External service requester.
 */
class ExternalServiceRequester {
  /**
   * Constructor.
   * @typedef {import('./decorators/decorator')} Decorator
   */
  constructor(config, registerConfig) {
    // Define singleton.
    if (!ExternalServiceRequester.singleton) {
      this.decorators = new Decorators(config);
      this.providers = new Providers(config, registerConfig);
      this.sandbox = Sandbox.getInstance();
      ExternalServiceRequester.singleton = this;
    }
    return ExternalServiceRequester.singleton;
  }

  /**
   * Send.
   * @param {object} data Data.
   * @param {string} data.providerName Provider name.
   * @param {object[]} data.documents Documents.
   * @param {object[]} data.events Events.
   * @param {string} data.documentTemplateId Document template ID.
   * @param {string} data.documentTemplateIdFunction Document template ID function.
   * @param {string} data.eventTemplateId Document template ID.
   * @param {string} data.additionalDocumentTemplateIds Document template IDs list.
   * @param {string} data.workflowId Workflow ID.
   * @param {object} data.filestorage Filestorage library.
   * @param {object} data.taskModel Task model.
   * @param {DocumentModel} data.documentModel Document model.
   * @param {DocumentAttachmentModel} data.documentAttachmentModel Document attachment model.
   * @param {EventModel} data.eventModel Event model.
   */
  async send(data) {
    // Get params.
    const {
      providerName,
      receiver,
      documents,
      events,
      documentTemplateId: staticDocumentTemplateId,
      documentTemplateIdFunction,
      eventTemplateId,
      additionalDocumentTemplateIds = [],
      workflowId,
    } = data;
    const documentTemplateId = documentTemplateIdFunction ? this.sandbox.evalWithArgs(
      documentTemplateIdFunction,
      [documents, events],
      { meta: { fn: 'documentTemplateIdFunction', caller: 'ExternalServiceRequester.send' } },
    ) : staticDocumentTemplateId;
    const document = documents?.find((d) => d.documentTemplateId === documentTemplateId);
    const event = events?.sort((a, b) => b.createdAt - a.createdAt).find((e) => e.eventTemplateId === eventTemplateId);
    const additionalDocuments = documents?.filter((d) => additionalDocumentTemplateIds.some((dId) => d.documentTemplateId === dId));

    // Get decorator.
    const decorator = this.getDecorator(providerName, documentTemplateId);
    if (!decorator) {
      log.save('external-service-error|decorator-not-found', { providerName, documentTemplateId });
      throw new Error('Decorator not found.');
    }

    // Transform object.
    const dataBeforeTransformation = { ...data, document, event, additionalDocuments };
    let dataToSend;
    try {
      dataToSend = await decorator.transform(dataBeforeTransformation);
    } catch (error) {
      log.save('external-service-error|transform-error', {
        error: error && error.message,
        providerName,
        receiver,
        documentTemplateId,
      });
      throw error;
    }

    // Get provider.
    const provider = this.getProvider(providerName);
    if (!provider) {
      log.save('external-service-error|provider-not-found', { providerName });
      throw new Error('Provider not found.');
    }

    // Send data.
    let sendingResult;
    try {
      sendingResult = await provider.send(dataToSend, false, {
        filestorage: data.filestorage,
        documentModel: data.documentModel,
        taskModel: data.taskModel,
        workflowId,
      });
    } catch (error) {
      log.save('external-service-error|send-error', {
        error: error.toString(),
        providerName,
        documentTemplateId,
      });
      throw error;
    }

    // Save external service ID if need it.
    let externalIdSavingResult;
    try {
      externalIdSavingResult = await this.setExternalIdIfNeedIt(sendingResult, data.documentModel);
    } catch (error) {
      log.save('external-service-error|set-external-id-error', {
        error: error && error.message,
        providerName,
        documentTemplateId,
      });
      throw error;
    }

    // Return result.
    return { sendingResult, externalIdSavingResult };
  }

  /**
   * Get decorator.
   * @param {string} provider Provider name.
   * @param {number} documentTemplateId Document template ID.
   * @returns {Decorator} Decorator instance.
   */
  getDecorator(provider, documentTemplateId) {
    if (provider.includes('.')) {
      const [providerName, providerMethodName] = provider.split('.');
      const providerInstance = this.decorators.byDocumentTemplate[providerName];
      const providerMethod = this.decorators.byDocumentTemplate[providerName][providerMethodName];

      if (!providerMethod) {
        throw new Error(`Provider "${providerName}" method "${providerMethodName}" not found.`);
      }

      return { transform: providerMethod.bind(providerInstance) };
    } else {
      const standardDecorator = this.decorators.byDocumentTemplate[provider];
      const defaultDecorator = this.decorators.byDocumentTemplate[provider].default;
      const specificDecorator = this.decorators.byDocumentTemplate[provider][documentTemplateId];
      return (standardDecorator.transform && standardDecorator) || specificDecorator || defaultDecorator;
    }
  }

  /**
   * Get provider
   * @param {String} provider
   * @returns {Provider} Provider instance.
   */
  getProvider(provider) {
    if (provider.includes('.')) {
      const [providerName, providerMethodName] = provider.split('.');
      const providerInstance = this.providers[providerName];
      const providerMethod = this.providers[providerName][providerMethodName];
      return { send: providerMethod.bind(providerInstance) };
    } else {
      return this.providers[provider];
    }
  }

  /**
   * Set external ID if need it.
   * @param {{externalIdToSave: {documentId, externalId}}} sendingResult Sending result with external ID to save.
   * @param {DocumentModel} documentModel Document model.
   */
  async setExternalIdIfNeedIt(sendingResult, documentModel) {
    // Define external ID params.
    const { externalIdToSave: { documentId, documentIds = [], externalId } = {} } = sendingResult;

    // Check if no need to save.
    if (!documentId || !externalId) {
      return;
    }

    // Set external ID and return result.
    const externalIdSavingResult = await documentModel.setExternalId(documentId, externalId);
    for (const documentId of documentIds) {
      await documentModel.setExternalId(documentId, externalId);
    }
    return externalIdSavingResult;
  }
}

module.exports = ExternalServiceRequester;
