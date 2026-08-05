const Filestorage = require('../../../lib/filestorage');

/**
 * Event cleaner.
 */
class EventCleaner {
  constructor(config = {}) {
    // Define singleton.
    if (!EventCleaner.singleton) {
      this.filestorage = new Filestorage(config.filestorage);
      EventCleaner.singleton = this;
    }

    return EventCleaner.singleton;
  }

  /**
   * Clear.
   * @param {{workflowId: string, eventTemplateId: number, documents: object[], events: object[], jsonSchemaObject: object}} data Data.
   */
  async clear({ workflowId }) {
    const report = {};

    report.tasks = await this.clearTasks(workflowId);
    report.documents = await this.clearDocuments(workflowId);
    const { updatedEventIds, updatedDocumentIds } = await this.clearEvents(workflowId);
    report.events = updatedEventIds;
    report.documents = report.documents.concat(updatedDocumentIds);
    return report;
  }

  /**
   * Clear tasks.
   * @private
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<void>}
   */
  async clearTasks(workflowId) {
    const tasks = await models.task.getTasksByWorkflowId(workflowId);
    const taskIds = tasks.map((item) => item.id);
    const updatedTaskIds = [];

    for (const taskId of taskIds) {
      await models.task.update(taskId, { performerUserNames: [], meta: { cleaned: true } });
      updatedTaskIds.push(taskId);
    }

    return updatedTaskIds;
  }

  /**
   * Clear documents.
   * @private
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<void>}
   */
  async clearDocuments(workflowId) {
    const documents = await models.task.getDocumentsByWorkflowId(workflowId, false);
    const updatedDocumentIds = [];
    for (const document of documents) {
      await models.document.updateData(document.id, { cleaned: true });
      await models.document.clearFileData(document.id);
      updatedDocumentIds.push(document.id);

      const documentAttachments = await models.documentAttachment.getByDocumentId(document.id);
      for (const { link } of documentAttachments) {
        await this.deleteFileAndSignatureFromFilestorage(link);
      }
      if (document.fileId) {
        await this.deleteFileAndSignatureFromFilestorage(document.fileId);
      }
      await models.documentAttachment.deleteByDocumentId(document.id);
      await models.documentSignature.deleteByDocumentId(document.id);
      await models.additionalDataSignature.deleteByDocumentId(document.id);
      await models.userInbox.deleteByDocumentId(document.id);
    }
    return updatedDocumentIds;
  }

  /**
   * Clear events.
   * @private
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<void>}
   */
  async clearEvents(workflowId) {
    const events = await models.event.getEventsByWorkflowId(workflowId);
    const updatedEventIds = [];
    const updatedDocumentIds = [];

    for (const { id: eventId, documentId } of events) {
      await models.event.update(eventId, { data: { cleaned: true } });
      updatedEventIds.push(eventId);
      if (documentId) {
        const document = await models.document.getByDocumentId(documentId);
        await models.document.updateData(documentId, { cleaned: true });
        await models.document.clearFileData(documentId);
        updatedDocumentIds.push(documentId);
        if (document.fileId) {
          await this.deleteFileAndSignatureFromFilestorage(document.fileId);
        }
        await models.userInbox.deleteByDocumentId(documentId);
      }
    }
    return { updatedEventIds, updatedDocumentIds };
  }

  /**
   * Delete file and signarure.
   * @private
   * @param {string} fileId File ID.
   * @returns {Promise<void>}
   */
  async deleteFileAndSignatureFromFilestorage(fileId) {
    try {
      await this.filestorage.deleteSignatureByFileId(fileId);
    } catch (error) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
    try {
      await this.filestorage.deleteP7sSignatureByFileId(fileId);
    } catch (error) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
    try {
      await this.filestorage.deleteFile(fileId);
    } catch (error) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
  }
}

module.exports = EventCleaner;
