const { Readable } = require('stream');

const contentType = 'application/pdf';

async function certResultSetStatus({
  externalServiceUser,
  requestId,
  // resultData,
  parsedResultData,
  // resultDataSign
}) {

  // const signatureInfo = await this.eds.getSignatureInfo(resultDataSign);
  // if (typeof signatureInfo !== 'object') {
  //   throw new Error('Can\'t get signature info');
  // }
  // const { content } = signatureInfo;

  // // Check signature.
  // if (!content.equals(resultData)) {
  //   throw new Error('Signed data not equals to origin');
  // }

  const document = await models.document.getByExternalId(requestId);

  if (!document) {
    throw new Error(`Can't find document by requestId: ${requestId}`);
  }

  const sourceDocumentId = document.id;
  const sourceTask = await models.task.findByDocumentId(sourceDocumentId);

  if (!sourceTask) {
    throw new Error(`Can't find task by documentId: ${sourceDocumentId}`);
  }

  const { workflowId } = sourceTask;
  const { data: { calculated: { taskTemplateIdToReceiveStatus } = {} } = {} } = document;

  if (!workflowId) {
    throw new Error('Workflow not found. Wrong sourceRequestId.');
  }
  if (!taskTemplateIdToReceiveStatus) {
    throw new Error('taskTemplateIdToReceiveStatus not found. Wrong sourceRequestId.');
  }

  // Define task and document entities.
  let taskId;
  let documentId;

  try {
    const taskAndDocumentEntities = await models.task.findDocumentByWorkflowIdAndTaskTemplateIds(workflowId, [taskTemplateIdToReceiveStatus]);
    const { task, document } = taskAndDocumentEntities;
    documentId = document.id;
    taskId = task.id;
  } catch (error) {
    log.save('external-services-controller|set-cert-result|cannot-find-task-and-document', { error: error && error.message }, 'error');
    throw new Error('Task to update getting error.', { cause: error });
  }

  if (!taskId) {
    throw new Error('Task to update not found. Wrong sourceRequestId.');
  }

  if (!documentId) {
    throw new Error('Document to update not found. Wrong sourceRequestId.');
  }

  const { P7S: signedCertDocument, certNum } = parsedResultData;
  const certDocumentSignatureInfo = await this.eds.getSignatureInfo(signedCertDocument);

  if (typeof certDocumentSignatureInfo !== 'object') {
    throw new Error('Can\'t get cert document signature info');
  }

  const { content: certDocumentBuffer } = certDocumentSignatureInfo;
  const certDocument = Buffer.from(certDocumentBuffer.toString(), 'base64');

  const originalFileName = 'Витяг з реєстру територіальної громади.pdf';
  const contentLength = certDocument.length;

  const readableStream = new Readable();
  readableStream.push(certDocument);
  readableStream.push(null);

  // Upload file.
  let fileInfo;
  try {
    fileInfo = await this.storageService.provider.uploadFileFromStream(readableStream, originalFileName, undefined, contentType, contentLength);
  } catch (error) {
    log.save('external-services-controller|set-cert-result|upload-to-file-storage-error', { originalFileName, contentLength, documentId });
    throw error;
  }
  const { id: fileId } = fileInfo;

  // Add to DB.
  try {
    // const documentAttachment = await this.documentAttachmentModel.create({
    //   documentId,
    //   name: originalFileName,
    //   type: contentType,
    //   size: contentLength,
    //   link: fileId,
    //   isGenerated: false,
    //   isSystem: true,
    //   meta: {}
    // });
    // log.save('external-services-controller|set-cert-result|create-document-attachment', documentAttachment);

    const documentFile = await models.document.addDocumentFile({
      id: documentId,
      updatedBy: externalServiceUser,
      fileId,
      fileName: originalFileName,
      fileType: contentType
    });

    log.save('external-services-controller|set-cert-result|set-document-file', documentFile);
  } catch (error) {
    log.save('external-services-controller|set-cert-result|create-document-attachment-error', {
      originalFileName,
      contentLength,
      documentId
    });
    throw error;
  }

  log.save('external-services-controller|set-cert-result|document-data-object', parsedResultData);

  // Update document.
  try {
    await businesses.document.updateByExternalService(documentId, parsedResultData, externalServiceUser, true);
  } catch (error) {
    log.save('external-services-controller|set-cert-result|cannot-update-document', { error: error && error.message }, 'error');
    throw new Error(`Cannot update document: ${error.message}`, { cause: error });
  }

  // Update workflow number.
  try {
    await models.workflow.setNumber(workflowId, certNum);
  } catch (error) {
    log.save('external-services-controller|set-cert-result|cannot-set-workflow-number', { error: error && error.message }, 'error');
    throw new Error(`Cannot update workflow number: ${error.message}`, { cause: error });
  }

  // Commit task.
  try {
    const finishedTask = await businesses.task.setStatusFinished(taskId, externalServiceUser, undefined, true);
    await businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);
    await models.document.setStatusFinal(documentId);
    // Send message to RabbitMQ.
    const message = { workflowId, taskId };
    global.messageQueue.produce(message);
  } catch (error) {
    if (error.details) {
      error.message += ' (' + error.details.map(errorDetailed => errorDetailed.dataPath + ' ' + errorDetailed.message).join(', ') + ')';
    }
    log.save('external-services-controller|set-cert-result|cannot-commit-task', { error: error && error.message }, 'error');
    throw new Error('Cannot commit task.', { cause: error });
  }
}

module.exports = certResultSetStatus;
