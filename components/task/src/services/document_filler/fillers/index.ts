import { TaskModel } from '../../../models/task';
import { EventModel } from '../../../models/event';
import { HelpersFiller } from './helpers';
import { UserInfoFiller } from './user_info';
import { CalculatedFieldsFiller } from './calculated_fields';
import { WorkflowDocumentsFiller } from './workflow_documents';
import { WorkflowFiller } from './workflow';
import { WorkflowDocumentsFunctionFiller } from './workflow_documents_function';
import { WorkflowTasksFunctionFiller } from './workflow_tasks_function';
import { WorkflowEventsFiller } from './workflow_events';
import { RegistersFiller } from './registers';
import { RegistersDefaultValueFiller } from './registers_default_value';
import { ExternalReaderFiller } from './external_reader';
import { ValueFunctionFiller } from './value_function';
import { VerifiedUserInfoFiller } from './verified_user_info';
import { CopyWorkflowDocumentFiller } from './copy_workflow_document';

// Constants.
const FILLERS_CLASSES_LIST = {
  HelpersFiller,
  UserInfoFiller,
  ExternalReaderFiller,
  WorkflowDocumentsFiller,
  WorkflowFiller,
  WorkflowDocumentsFunctionFiller,
  WorkflowTasksFunctionFiller,
  WorkflowEventsFiller,
  RegistersFiller,
  RegistersDefaultValueFiller,
  CalculatedFieldsFiller,
  ValueFunctionFiller,
  VerifiedUserInfoFiller,
  CopyWorkflowDocumentFiller,
};

/**
 * Fillers.
 */
export class Fillers {
  private static singleton: Fillers;
  eventModel: any;
  initializedFillers: any;
  taskModel: any;

  /**
   * Fillers constructor.
   * @param {object[]} [customFillers] Custom fillers list.
   */
  constructor(customFillers = []) {
    // Define singleton.
    if (!Fillers.singleton) {
      this.taskModel = new TaskModel();
      this.eventModel = new EventModel();
      const fillersClasses = [...Object.values(Fillers.List), ...customFillers];
      this.initializedFillers = fillersClasses.map((v) => new v());
      Fillers.singleton = this;
    }
    return Fillers.singleton;
  }

  /**
   * List.
   */
  static get List() {
    return FILLERS_CLASSES_LIST;
  }

  /**
   * Fill.
   * @param {object} jsonSchema JSON schema object.
   * @param {object} documentData Document data to fill.
   * @param {object} [options] Options.
   * @param {string} [options.workflowId] Workflow ID.
   * @param {string} [options.documentId] Document ID.
   * @param {string} [options.userId] User ID.
   * @param {object} [options.userUnits] User units.
   * @param {object} [options.userUnitsEntities] User units entities.
   * @param {string} [options.oauthToken] OAuth user token.
   */
  async fill(jsonSchema, documentData, options) {
    const { workflowId } = options;
    let currentOnlyDocuments; // Only process documents with isCurrentOnly = true.
    let allProcessDocuments; // All process documents.
    let events;

    // Find documents and events from current workflow to pass to filers options.
    try {
      allProcessDocuments = await this.taskModel.getDocumentsByWorkflowId(workflowId, false);
      currentOnlyDocuments = allProcessDocuments.filter((document) => document.isTaskCurrent);
    } catch (error) {
      global.log.save('document-filler-get-documents-error', error, 'error');
    }
    try {
      events = await this.eventModel.getEventsByWorkflowId(workflowId);
    } catch (error) {
      global.log.save('document-filler-get-events-error', error, 'error');
    }

    // Fill object using all fillers.
    for (const filler of this.initializedFillers) {
      // "documents: [...documents]" - for prevent modification documents and events in value function.
      await filler.fill(jsonSchema, documentData, {
        ...options,
        documents: [...currentOnlyDocuments],
        allProcessDocuments: [...allProcessDocuments],
        events: [...events],
      });
    }

    // Return filled object.
    return documentData;
  }
}
