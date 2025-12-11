
const TaskModel = require('../../../models/task');
const EventModel = require('../../../models/event');
const HelpersFiller = require('./helpers');
const UserInfoFiller = require('./user_info');
const CalculatedFieldsFiller = require('./calculated_fields');
const WorkflowDocumentsFiller = require('./workflow_documents');
const WorkflowFiller = require('./workflow');
const WorkflowDocumentsFunctionFiller = require('./workflow_documents_function');
const WorkflowTasksFunctionFiller = require('./workflow_tasks_function');
const WorkflowEventsFiller = require('./workflow_events');
const RegistersFiller = require('./registers');
const RegistersDefaultValueFiller = require('./registers_default_value');
const ExternalReaderFiller = require('./external_reader');
const ValueFunctionFiller = require('./value_function');
const VerifiedUserInfoFiller = require('./verified_user_info');
const CopyWorkflowDocumentFiller = require('./copy_workflow_document');

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
  CopyWorkflowDocumentFiller
};

/**
 * Fillers.
 */
class Fillers {
  /**
   * Fillers constructor.
   * @param {object[]} [customFillers] Custom fillers list.
   */
  constructor(customFillers = []) {
    // Define singleton.
    if (!Fillers.singleton) {
      this.taskModel = new TaskModel();
      this.eventModel = new EventModel();
      const fillersClasses = [ ...Object.values(Fillers.List), ...customFillers ];
      this.initializedFillers = fillersClasses.map(v => new v());
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
      currentOnlyDocuments = allProcessDocuments.filter(document => document.isTaskCurrent);
    } catch (error) {
      log.save('document-filler-get-documents-error', error, 'error');
    }
    try {
      events = await this.eventModel.getEventsByWorkflowId(workflowId);
    } catch (error) {
      log.save('document-filler-get-events-error', error, 'error');
    }

    // Fill object using all fillers.
    for (const filler of this.initializedFillers) {
      // "documents: [...documents]" - for prevent modification documents and events in value function.
      await filler.fill(jsonSchema, documentData, {
        ...options,
        documents: [ ...currentOnlyDocuments ],
        allProcessDocuments: [ ...allProcessDocuments ],
        events: [ ...events ]
      });
    }

    // Return filled object.
    return documentData;
  }
}

module.exports = Fillers;
