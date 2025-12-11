
// const DictionariesModel = require('./dictionaries');
const WorkflowModel = require('./workflow');
const WorkflowTemplateCategoryModel = require('./workflow_template_category');
const WorkflowTemplateModel = require('./workflow_template');
const WorkflowErrorModel = require('./workflow_error');
const WorkflowRestartModel = require('./workflow_restart');
const TaskModel = require('./task');
const TaskTemplateModel = require('./task_template');
const DocumentModel = require('./document');
const DocumentAttachmentModel = require('./document_attachment');
const DocumentTemplateModel = require('./document_template');
const DocumentSignatureModel = require('./document_signature');
const DocumentSignatureRejectionModel = require('./document_signature_rejection');
const AdditionalDataSignatureModel = require('./additional_data_signature');
const UnitModel = require('./unit');
const UnitAccessModel = require('./unit_access');
const UserInboxModel = require('./user_inbox');
const NumberTemplateModel = require('./number_template');
const EventModel = require('./event');
const EventTemplateModel = require('./event_template');
const GatewayModel = require('./gateway');
const GatewayTemplateModel = require('./gateway_template');
const PaymentLogsModel = require('./payment_logs');
const CustomLogTemplateModel = require('./custom_log_template');
const CustomLogModel = require('./custom_log');
const AccessHistoryModel = require('./access_history');
const UIFilterModel = require('./ui_filter');
const CustomInterfaceModel = require('./custom_interface');
const WorkflowHistoryModel = require('./workflow_history');
const FavoritesModel = require('./favorites');
const ExternalServicesStatusesModels = require('./external_services_statuses');
const KycSessionModel = require('./kyc_session');

// Constants.
const MODELS_CLASSES_LIST = {
  // DictionariesModel,
  WorkflowModel,
  WorkflowTemplateCategoryModel,
  WorkflowTemplateModel,
  WorkflowErrorModel,
  WorkflowRestartModel,
  TaskModel,
  TaskTemplateModel,
  DocumentModel,
  DocumentAttachmentModel,
  DocumentTemplateModel,
  DocumentSignatureModel,
  DocumentSignatureRejectionModel,
  AdditionalDataSignatureModel,
  UnitModel,
  UnitAccessModel,
  UserInboxModel,
  NumberTemplateModel,
  EventModel,
  EventTemplateModel,
  GatewayModel,
  GatewayTemplateModel,
  PaymentLogsModel,
  CustomLogTemplateModel,
  CustomLogModel,
  AccessHistoryModel,
  UIFilterModel,
  CustomInterfaceModel,
  WorkflowHistoryModel,
  FavoritesModel,
  ExternalServicesStatusesModels,
  KycSessionModel,
};

class Models {
  /**
   * Models constructor.
   * @param {object} [customModels] Custom models as { someModelName: SomeModelClass, anotherModelName: AnotherModelClass }.
   */
  constructor(customModels = {}) {
    // Define singleton.
    if (!Models.singleton) {
      this.initModels(customModels);
      this.initRelationships();
      Models.singleton = this;
    }
    return Models.singleton;
  }

  /**
   * Classes list.
   */
  static get List() {
    return MODELS_CLASSES_LIST;
  }

  /**
   * Init models.
   * @private
   * @param {object} [customModels] Custom models as { someModelName: SomeModelClass, anotherModelName: AnotherModelClass }.
   */
  initModels(customModels = {}) {
    // Define names of model classes.
    const namesOfModels = {
      // dictionaries: DictionariesModel,
      workflow: WorkflowModel,
      workflowTemplateCategory: WorkflowTemplateCategoryModel,
      workflowTemplate: WorkflowTemplateModel,
      workflowError: WorkflowErrorModel,
      workflowRestart: WorkflowRestartModel,
      task: TaskModel,
      taskTemplate: TaskTemplateModel,
      document: DocumentModel,
      documentAttachment: DocumentAttachmentModel,
      documentTemplate: DocumentTemplateModel,
      documentSignature: DocumentSignatureModel,
      documentSignatureRejection: DocumentSignatureRejectionModel,
      additionalDataSignature: AdditionalDataSignatureModel,
      unit: UnitModel,
      unitAccess: UnitAccessModel,
      userInbox: UserInboxModel,
      numberTemplate: NumberTemplateModel,
      event: EventModel,
      eventTemplate: EventTemplateModel,
      gateway: GatewayModel,
      gatewayTemplate: GatewayTemplateModel,
      paymentLogs: PaymentLogsModel,
      customLogTemplate: CustomLogTemplateModel,
      customLog: CustomLogModel,
      accessHistory: AccessHistoryModel,
      uiFilter: UIFilterModel,
      customInterface: CustomInterfaceModel,
      workflowHistory: WorkflowHistoryModel,
      favorites: FavoritesModel,
      externalServicesStatuses: ExternalServicesStatusesModels,
      kycSession: KycSessionModel,
      ...customModels
    };

    // Init models.
    this.models = Object.entries(namesOfModels)
      .map(v => [v[0], new v[1]()])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => { let n = {}; n[v[0]] = v[1]; return n; })()
        }),
        {}
      );

    global.models = this.models;
  }

  /**
   * Init relationships.
   * @private
   */
  initRelationships() {
    this.models.workflow.model.belongsTo(this.models.workflowTemplate.model, { foreignKey: 'workflow_template_id', targetKey: 'id' });
    this.models.workflow.model.hasMany(this.models.task.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.workflow.model.hasMany(this.models.event.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.workflow.model.hasMany(this.models.gateway.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.workflow.model.hasMany(this.models.workflowError.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.workflow.model.hasMany(this.models.workflowRestart.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.workflowTemplate.model.belongsTo(this.models.workflowTemplateCategory.model, { foreignKey: 'workflow_template_category_id', targetKey: 'id' });
    this.models.task.model.belongsTo(this.models.document.model, { foreignKey: 'document_id', targetKey: 'id' });
    this.models.task.model.belongsTo(this.models.workflow.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.task.model.belongsTo(this.models.taskTemplate.model, { foreignKey: 'task_template_id', targetKey: 'id' });
    this.models.taskTemplate.model.belongsTo(this.models.documentTemplate.model, { foreignKey: 'document_template_id', targetKey: 'id' });
    this.models.documentTemplate.model.belongsTo(this.models.taskTemplate.model, { foreignKey: 'id', targetKey: 'document_template_id' });
    this.models.document.model.hasOne(this.models.task.model, { foreignKey: 'document_id', targetKey: 'id' });
  }
}

module.exports = Models;
