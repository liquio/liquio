const ShareAccessModel = require('./share_access');
const AccessHistoryModel = require('./access_history');
const AdditionalDataSignatureModel = require('./additional_data_signature');
const DocumentSignatureModel = require('./document_signature');
const DocumentAttachmentModel = require('./document_attachment');
const DocumentTemplateModel = require('./document_template');
const DocumentModel = require('./document');
const EventTemplateModel = require('./event_template');
const EventTypeModel = require('./event_type');
const EventModel = require('./event');
const TaskModel = require('./task');
const TaskTemplateModel = require('./task_template');
const UnitModel = require('./unit');
const UserInboxModel = require('./user_inbox');
const WorkflowErrorModel = require('./workflow_error');
const WorkflowTemplateModel = require('./workflow_template');
const WorkflowModel = require('./workflow');
const CustomLogTemplateModel = require('./custom_log_template');
const CustomLogModel = require('./custom_log');
const RawQueryModel = require('./raw_query');

class Models {
  /**
   * Models constructor.
   */
  constructor() {
    // Define singleton.
    if (!Models.singleton) {
      // Init models
      this.initModels();
      Models.singleton = this;
    }
    return Models.singleton;
  }

  /**
   * Init models.
   * @private
   */
  initModels() {
    // Define names of model classes.
    const namesOfModels = {
      shareAccess: ShareAccessModel,
      accessHistory: AccessHistoryModel,
      additionalDataSignature: AdditionalDataSignatureModel,
      documentSignature: DocumentSignatureModel,
      documentAttachment: DocumentAttachmentModel,
      documentTemplate: DocumentTemplateModel,
      document: DocumentModel,
      eventTemplate: EventTemplateModel,
      eventType: EventTypeModel,
      event: EventModel,
      task: TaskModel,
      taskTemplate: TaskTemplateModel,
      unit: UnitModel,
      userInbox: UserInboxModel,
      workflowError: WorkflowErrorModel,
      workflowTemplate: WorkflowTemplateModel,
      workflow: WorkflowModel,
      customLogTemplate: CustomLogTemplateModel,
      customLog: CustomLogModel,
      rawQueryModel: RawQueryModel,
    };

    // Init models.
    this.models = Object.entries(namesOfModels)
      .map((v) => [v[0], new v[1]()])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            let n = {};
            n[v[0]] = v[1];
            return n;
          })(),
        }),
        {},
      );

    // Set models as global.
    global.models = this.models;
  }
}

module.exports = Models;
