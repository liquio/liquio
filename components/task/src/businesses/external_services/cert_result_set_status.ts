import { Readable } from 'node:stream';

const contentType = 'application/pdf';

export async function certResultSetStatus(this: any, {
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

  const document = await global.models.document.getByExternalId(requestId);

  if (!document) {
    throw new Error(`Can't find document by requestId: ${requestId}`);
  }

  const sourceDocumentId = document.id;
  const sourceTask = await global.models.task.findByDocumentId(sourceDocumentId);

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
    const taskAndDocumentEntities = await (global.models.task.findDocumentByWorkflowIdAndTaskTemplateIds as any)(
      workflowId, [taskTemplateIdToReceiveStatus],
    );
    const { task, document } = taskAndDocumentEntities;
    documentId = document.id;
    taskId = task.id;
  } catch (error) {
    global.log.save('external-services-controller|set-cert-result|cannot-find-task-and-document', { error: error && error.message }, 'error');
    const wrappedError = new Error('Task to update getting error.');
    (wrappedError as any).cause = error;
    throw wrappedError;
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
    global.log.save('external-services-controller|set-cert-result|upload-to-file-storage-error', { originalFileName, contentLength, documentId });
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

    const documentFile = await (global.models.document.addDocumentFile as any)({
      id: documentId,
      updatedBy: externalServiceUser,
      fileId,
      fileName: originalFileName,
      fileType: contentType
    });

    global.log.save('external-services-controller|set-cert-result|set-document-file', documentFile);
  } catch (error) {
    global.log.save('external-services-controller|set-cert-result|create-document-attachment-error', {
      originalFileName,
      contentLength,
      documentId
    });
    throw error;
  }

  global.log.save('external-services-controller|set-cert-result|document-data-object', parsedResultData);

  // Update document.
  try {
    await global.businesses.document.updateByExternalService(documentId, parsedResultData, externalServiceUser, true);
  } catch (error) {
    global.log.save('external-services-controller|set-cert-result|cannot-update-document', { error: error && error.message }, 'error');
    const wrappedError = new Error(`Cannot update document: ${error.message}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }

  // Update workflow number.
  try {
    await global.models.workflow.setNumber(workflowId, certNum);
  } catch (error) {
    global.log.save('external-services-controller|set-cert-result|cannot-set-workflow-number', { error: error && error.message }, 'error');
    const wrappedError = new Error(`Cannot update workflow number: ${error.message}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }

  // Commit task.
  try {
    const finishedTask = await global.businesses.task.setStatusFinished(taskId, externalServiceUser, undefined, true);
    await global.businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);
    await global.models.document.setStatusFinal(documentId);
    // Send message to RabbitMQ.
    const message = { workflowId, taskId };
    global.messageQueue.produce(message);
  } catch (error: any) {
    if (error.details) {
      error.message += ' (' + error.details.map(errorDetailed => errorDetailed.dataPath + ' ' + errorDetailed.message).join(', ') + ')';
    }
    global.log.save('external-services-controller|set-cert-result|cannot-commit-task', { error: error && error.message }, 'error');
    const wrappedError = new Error('Cannot commit task.');
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}
