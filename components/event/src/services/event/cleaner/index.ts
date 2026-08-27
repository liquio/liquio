import { FileStorage } from '../../../lib/filestorage';

/**
 * Event cleaner.
 */
export class EventCleaner {
  static singleton: EventCleaner;

  filestorage: FileStorage;

  constructor(config: any = {}) {
    // Define singleton.
    if (!EventCleaner.singleton) {
      this.filestorage = new FileStorage(config.filestorage);
      EventCleaner.singleton = this;
    }

    return EventCleaner.singleton;
  }

  /**
   * Clear.
   * @param {{workflowId: string, eventTemplateId: number, documents: object[], events: object[], jsonSchemaObject: object}} data Data.
   */
  async clear(data: any): Promise<any> {
    const { workflowId } = data;
    const report: any = {};

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
  async clearTasks(workflowId: string): Promise<any[]> {
    const tasks = await global.models.task.getTasksByWorkflowId(workflowId);
    const taskIds = tasks.map((item: any) => item.id);
    const updatedTaskIds = [];

    for (const taskId of taskIds) {
      await global.models.task.update(taskId, { performerUserNames: [], meta: { cleaned: true } });
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
  async clearDocuments(workflowId: string): Promise<any[]> {
    const documents = await global.models.task.getDocumentsByWorkflowId(workflowId, false);
    const updatedDocumentIds = [];
    for (const document of documents) {
      await global.models.document.updateData(document.id, { cleaned: true });
      await global.models.document.clearFileData(document.id);
      updatedDocumentIds.push(document.id);

      const documentAttachments = await global.models.documentAttachment.getByDocumentId(document.id);
      for (const { link } of documentAttachments) {
        await this.deleteFileAndSignatureFromFilestorage(link);
      }
      if (document.fileId) {
        await this.deleteFileAndSignatureFromFilestorage(document.fileId);
      }
      await global.models.documentAttachment.deleteByDocumentId(document.id);
      await global.models.documentSignature.deleteByDocumentId(document.id);
      await global.models.additionalDataSignature.deleteByDocumentId(document.id);
      await global.models.userInbox.deleteByDocumentId(document.id);
    }
    return updatedDocumentIds;
  }

  /**
   * Clear events.
   * @private
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<void>}
   */
  async clearEvents(workflowId: string): Promise<{ updatedEventIds: any[]; updatedDocumentIds: any[] }> {
    const events = await global.models.event.getEventsByWorkflowId(workflowId);
    const updatedEventIds = [];
    const updatedDocumentIds = [];

    for (const { id: eventId, documentId } of events) {
      await global.models.event.update(eventId, { data: { cleaned: true } });
      updatedEventIds.push(eventId);
      if (documentId) {
        const document = await global.models.document.getByDocumentId(documentId);
        await global.models.document.updateData(documentId, { cleaned: true });
        await global.models.document.clearFileData(documentId);
        updatedDocumentIds.push(documentId);
        if (document.fileId) {
          await this.deleteFileAndSignatureFromFilestorage(document.fileId);
        }
        await global.models.userInbox.deleteByDocumentId(documentId);
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
  async deleteFileAndSignatureFromFilestorage(fileId: string): Promise<void> {
    try {
      await this.filestorage.deleteSignatureByFileId(fileId);
    } catch (error: any) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
    try {
      await this.filestorage.deleteP7sSignatureByFileId(fileId);
    } catch (error: any) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
    try {
      await this.filestorage.deleteFile(fileId);
    } catch (error: any) {
      if (!error.message.includes('Can not delete.')) {
        throw error;
      }
    }
  }
}
