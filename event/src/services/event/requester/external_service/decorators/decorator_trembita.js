const _ = require('lodash');
const Decorator = require('./decorator');
const typeOf = require('../../../../../lib/type_of');

// Constants.
const BODY_WORKFLOW_ID_AND_TIMESTAMP_SEPARATOR = '|';
const TREMBITA_TEMPLATE = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xro="http://x-road.eu/xsd/xroad.xsd" xmlns:iden="http://x-road.eu/xsd/identifiers" xmlns:drac="dracs">
<soapenv:Header>
   <xro:client iden:objectType="{header.client.objectType}">
      <iden:xRoadInstance>{header.client.xRoadInstance}</iden:xRoadInstance>
      <iden:memberClass>{header.client.memberClass}</iden:memberClass>
      <iden:memberCode>{header.client.memberCode}</iden:memberCode>
      <iden:subsystemCode>{header.client.subsystemCode}</iden:subsystemCode>
   </xro:client>
   <xro:service iden:objectType="{header.service.objectType}">
      <iden:xRoadInstance>{header.service.xRoadInstance}</iden:xRoadInstance>
      <iden:memberClass>{header.service.memberClass}</iden:memberClass>
      <iden:memberCode>{header.service.memberCode}</iden:memberCode>
      <iden:subsystemCode>{header.service.subsystemCode}</iden:subsystemCode>
      <iden:serviceCode>{header.service.serviceCode}</iden:serviceCode>
   </xro:service>
   <xro:userId>{header.userId}</xro:userId>
   <xro:id>{header.id}</xro:id>
   <xro:protocolVersion>{header.protocolVersion}</xro:protocolVersion>
</soapenv:Header>
<soapenv:Body>
   <drac:PetitionExchangePacket>
      <drac:asicBase64>{body.asicBase64}</drac:asicBase64>
      <drac:documentId>{body.documentId}</drac:documentId>
      <drac:timestamp>{body.timestamp}</drac:timestamp>
      <drac:workflowId>{body.workflowId}</drac:workflowId>
   </drac:PetitionExchangePacket>
</soapenv:Body>
</soapenv:Envelope>`;

/**
 * Decorator Trembita.
 * @typedef {import('../../../../../entities/document')} DocumentEntity
 * @typedef {import('../../../../../entities/document_attachment')} DocumentAttachmentModel
 * @typedef {import('../../../../../lib/filestorage')} Filestorage
 * @typedef {import('../../../../../models/event')} EventModel
 */
class DecoratorTrembita extends Decorator {
  /**
   * Transform.
   * @param {object} data Data to transform.
   * @param {string} data.providerName Provider name.
   * @param {DocumentEntity[]} data.documents Documents.
   * @param {object} data.documentTemplateId Document template ID.
   * @param {string} data.workflowId Workflow ID.
   * @param {Filestorage} data.filestorage Filestorage library.
   * @param {object} data.taskModel Task model.
   * @param {object} data.documentModel Document model.
   * @param {object} data.eventModel Event model.
   * @param {DocumentEntity} data.document Document defined by template ID.
   * @param {Object<function>} data.options Custom options.
   * @param {string} data.service Trembita service name.
   * @returns {Promise<object>} Data to send promise.
   */
  async transform(data) {
    // Get params.
    const {
      documentTemplateId,
      workflowId,
      document,
      documents,
      filestorage,
      sendFile,
      sendFileFromEvent,
      eventModel,
      options,
      service,
      attachments,
      documentAttachmentModel,
    } = data;
    const { id: documentId, data: documentData, fileId } = document;

    // Get P7S.
    let fileP7s;
    if (sendFile) {
      // Check if file from different document.
      let fileIdToGetP7s = fileId;
      if (typeof sendFile === 'number') {
        const documentWithFile = documents.find((v) => v.documentTemplateId === sendFile);
        fileIdToGetP7s = documentWithFile.fileId;
      }

      // Get P7S.
      const p7sInfo = await filestorage.getP7sSignature(fileIdToGetP7s);
      const { p7s = '' } = p7sInfo || {};
      fileP7s = p7s;
    }

    // Prepare params to send.
    const dataObject = {
      ...((documentData && documentData.data) || documentData),
      sign: fileP7s,
    };

    // Cloning data object for logging in future.
    const dataObjectForLog = _.cloneDeep(dataObject);

    // Get attachments.
    if (attachments && attachments.needSend) {
      const attachmentsDocument = documents.find((v) => v.documentTemplateId === attachments.documentTemplateId);
      const documentAttachmentList = await documentAttachmentModel.getByDocumentId(attachmentsDocument.id);
      const attachmentList = documentAttachmentList.filter((v) => v.meta && v.meta.isSend);

      const promises = [];
      for (const attachment of attachmentList) {
        promises.push(filestorage.downloadFileWithoutStream(attachment.link, true));
      }
      const responseList = await Promise.allSettled(promises);

      const isAllFilesDownloaded = responseList.every((v) => v.status === 'fulfilled');
      if (!isAllFilesDownloaded) {
        throw new Error('Trembita decorator error. Cannot download all attachments from filestorage.');
      }
      const fileBufferList = responseList.map((v) => v.value);

      const filesElectronicDocuments = [];
      for (const [index, attachment] of attachmentList.entries()) {
        const fileBuffer = fileBufferList[index];
        const fileBase64 = fileBuffer.toString('base64');
        const { meta: { type, description } = {} } = attachment;

        filesElectronicDocuments.push({
          descriptionelDocType: type,
          nameelDocFileName: description,
          fileContentelDocument: fileBase64,
        });
      }

      // Add attachments to request.
      dataObject.fileselectronicdocuments = filesElectronicDocuments;
    }

    // Check options.
    const { fileIdFromEvent } = await this.checkOptions(
      options,
      document,
      dataObject,
      dataObjectForLog,
      sendFileFromEvent,
      filestorage,
      eventModel,
      workflowId,
    );

    const timestamp = +new Date();

    // Fill soap message for send.
    const dataString = JSON.stringify(dataObject);
    const dataBase64 = Buffer.from(dataString, 'utf8').toString('base64');
    const soapMessage = this.fillSoapMessage(dataBase64, documentId, timestamp, workflowId, service);

    // Fill soap message for logging.
    const dataStringForLog = JSON.stringify(dataObjectForLog);
    const dataBase64ForLog = Buffer.from(dataStringForLog, 'utf8').toString('base64');
    const soapMessageForLog = this.fillSoapMessage(dataBase64ForLog, documentId, timestamp, workflowId, service);

    // Define and return transformed data.
    const transformedData = {
      documentTemplateId,
      workflowId,
      documentId,
      soapMessage,
      soapMessageForLog,
      fileIdFromEvent,
      sendFileFromEventKeyName: sendFileFromEvent && sendFileFromEvent.keyName,
    };
    return { transformedData, service };
  }

  /**
   * Get file from event.
   * @param {EventModel} eventModel.
   * @param {Filestorage} filestorage.
   * @param {string} workflowId.
   * @param {number} eventTemplateId.
   * @return {Promise<{fileBuffer: string}>} File in Base64.
   */
  async getFileFromEvent(filestorage, eventModel, workflowId, eventTemplateId) {
    // Get workflow events.
    const lastEventWithFileId = await eventModel.getLastByWorkflowIdAndTemplateId(workflowId, eventTemplateId);

    // Check that fileId exist.
    if (typeOf(lastEventWithFileId?.data?.result?.saveDocument?.savedDocument?.fileId) !== 'string') {
      throw new Error('Cannot get saved document file id.');
    }

    // Download file from filestorage.
    const { fileId } = lastEventWithFileId.data.result.saveDocument.savedDocument;
    const file = await filestorage.downloadFileWithoutStream(fileId);

    // Return file buffer and file id.
    return {
      fileBase64: Buffer.from(file).toString('base64'),
      fileId,
    };
  }

  /**
   *
   * @param {object[]} options
   * @param {DocumentEntity} document
   * @param {object} dataObject
   * @param {object} dataObjectForLog
   * @param {{keyName: string, eventTemplateId: number}} sendFileFromEvent
   * @param {Filestorage} filestorage
   * @param {EventModel} eventModel
   * @param {string} workflowId
   * @return {Promise<{fileIdFromEvent: string}>}
   */
  async checkOptions(options, document, dataObject, dataObjectForLog, sendFileFromEvent, filestorage, eventModel, workflowId) {
    // If options exist.
    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      // Execute function from json schema.

      if (options.needSendFileFromEvent && this.sandbox.evalWithArgs(
        options.needSendFileFromEvent,
        [document],
        { meta: { fn: 'needSendFileFromEvent', caller: 'DecoratorTrembita.transform' } },
      )) {
        // Get file from event.
        const { fileBase64, fileId: fileIdFromEvent } = await this.getFileFromEvent(
          filestorage,
          eventModel,
          workflowId,
          sendFileFromEvent.eventTemplateId,
        );

        // Set file buffer to data object.
        if (sendFileFromEvent.keyName.indexOf('.') !== -1) {
          _.set(dataObject, sendFileFromEvent.keyName, fileBase64);
          _.set(dataObjectForLog, sendFileFromEvent.keyName, fileIdFromEvent);
        } else {
          dataObject[sendFileFromEvent.keyName] = fileBase64;
          dataObjectForLog[sendFileFromEvent.keyName] = fileIdFromEvent;
        }

        // Return id of created file.
        return { fileIdFromEvent };
      }
    }

    // Return empty object.
    return {};
  }

  /**
   *
   * @param {string} dataBase64
   * @param {string} documentId
   * @param {string} timestamp
   * @param {string} workflowId
   * @param {string} service Trembita service name
   * @return {string}
   */
  fillSoapMessage(dataBase64, documentId, timestamp, workflowId, service) {
    // Trembita SOAP message container.
    let soapMessage = TREMBITA_TEMPLATE;

    // Get trembtia config.
    const trembitaConfig = this.getTrembitaConfig(service);

    // Append Trembita header configs.
    const headerId = timestamp;
    soapMessage = soapMessage
      .replace('{header.client.objectType}', trembitaConfig.trembitaHeader.client.objectType)
      .replace('{header.client.xRoadInstance}', trembitaConfig.trembitaHeader.client.xRoadInstance)
      .replace('{header.client.memberClass}', trembitaConfig.trembitaHeader.client.memberClass)
      .replace('{header.client.memberCode}', trembitaConfig.trembitaHeader.client.memberCode)
      .replace('{header.client.subsystemCode}', trembitaConfig.trembitaHeader.client.subsystemCode)
      .replace('{header.service.objectType}', trembitaConfig.serviceConfig.objectType)
      .replace('{header.service.xRoadInstance}', trembitaConfig.serviceConfig.xRoadInstance)
      .replace('{header.service.memberClass}', trembitaConfig.serviceConfig.memberClass)
      .replace('{header.service.memberCode}', trembitaConfig.serviceConfig.memberCode)
      .replace('{header.service.subsystemCode}', trembitaConfig.serviceConfig.subsystemCode)
      .replace('{header.service.serviceCode}', trembitaConfig.serviceConfig.serviceCode)
      .replace('{header.service.serviceVersion}', trembitaConfig.serviceConfig.serviceVersion)
      .replace('{header.userId}', trembitaConfig.trembitaHeader.userId)
      .replace('{header.id}', headerId)
      .replace('{header.protocolVersion}', trembitaConfig.trembitaHeader.protocolVersion);

    // Define Trembita body.
    const bodyAsicBase64 = dataBase64;
    const bodyDocumentId = documentId;
    const bodyTimestamp = timestamp;
    const bodyWorkflowId = `${workflowId}${BODY_WORKFLOW_ID_AND_TIMESTAMP_SEPARATOR}${timestamp}`;
    soapMessage = soapMessage
      .replace('{body.documentId}', bodyDocumentId)
      .replace('{body.timestamp}', bodyTimestamp)
      .replace('{body.workflowId}', bodyWorkflowId)
      .replace('{body.asicBase64}', bodyAsicBase64);

    // Return soap message.
    return soapMessage;
  }

  /**
   * @private
   * @param {string} service Service name
   * @return {{trembitaHeader: Object, serviceConfig: Object}} Service config
   */
  getTrembitaConfig(service) {
    const {
      requester: {
        externalService: {
          trembita: { trembitaHeader, serviceList = {} },
        },
      },
    } = global.config;

    // Get specific or default service config.
    const serviceConfig = serviceList[service] || trembitaHeader.service;

    if (!serviceConfig) {
      throw new Error('Trembita provider. Service config not defined.');
    }

    return { trembitaHeader, serviceConfig };
  }
}

module.exports = DecoratorTrembita;
