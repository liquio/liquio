const WorkflowStatusModel = require('./workflow_status');
const WorkflowTemplateCategoryModel = require('./workflow_template_category');
const WorkflowTemplateModel = require('./workflow_template');
const WorkflowTemplateTagModel = require('./workflow_template_tag');
const WorkflowTemplateTagMapModel = require('./workflow_template_tag_map');
const WorkflowModel = require('./workflow');
const WorkflowErrorModel = require('./workflow_error');
const WorkflowRestartModel = require('./workflow_restart');
const WorkflowHistoryModel = require('./workflow_history');
const WorkflowDebugModel = require('./workflow_debug');
const TaskTemplateModel = require('./task_template');
const TaskModel = require('./task');
const DocumentTemplateModel = require('./document_template');
const DocumentAttachmentModel = require('./document_attachment');
const DocumentSignatureModel = require('./document_signature');
const DocumentModel = require('./document');
const EventModel = require('./event');
const EventTypeModel = require('./event_type');
const EventTemplateModel = require('./event_template');
const GatewayModel = require('./gateway');
const GatewayTypeModel = require('./gateway_type');
const GatewayTemplateModel = require('./gateway_template');
const UnitModel = require('./unit');
const NumberTemplateModel = require('./number_template');
const CustomLogModel = require('./custom_log');
const CustomLogTemplateModel = require('./custom_log_template');
const AccessHistoryModel = require('./access_history');
const UnitRulesModel = require('./unit_rules');
const UIFilterModel = require('./ui_filter');
const CustomInterfaceModel = require('./custom_interface');
const ProxyItemModel = require('./proxy_item');
const ElasticReindexLog = require('./elastic_reindex_log');
const FavoritesModel = require('./favorites');
const SnippetsModel = require('./snippets');
const SnippetGroupsModel = require('./snippet_groups');
const MassMessagesMailingModel = require('./mass_messages_mailing');
const SignatureRemovalHistory = require('./signature_removal_history');
const AdditionalDataSignatureModel = require('./additional_data_signature');
const UserSettingsModel = require('./user_settings');

// Constants.
const MODELS_CLASSES_LIST = {
  WorkflowStatusModel,
  WorkflowTemplateCategoryModel,
  WorkflowTemplateModel,
  WorkflowTemplateTagModel,
  WorkflowTemplateTagMapModel,
  WorkflowModel,
  WorkflowErrorModel,
  WorkflowRestartModel,
  WorkflowHistoryModel,
  WorkflowDebugModel,
  TaskTemplateModel,
  TaskModel,
  DocumentTemplateModel,
  DocumentAttachmentModel,
  DocumentSignatureModel,
  DocumentModel,
  EventModel,
  EventTypeModel,
  EventTemplateModel,
  GatewayModel,
  GatewayTypeModel,
  GatewayTemplateModel,
  UnitModel,
  NumberTemplateModel,
  CustomLogModel,
  CustomLogTemplateModel,
  AccessHistoryModel,
  UnitRulesModel,
  UIFilterModel,
  CustomInterfaceModel,
  ProxyItemModel,
  ElasticReindexLog,
  FavoritesModel,
  SnippetsModel,
  SnippetGroupsModel,
  MassMessagesMailingModel,
  SignatureRemovalHistory,
  AdditionalDataSignatureModel,
  UserSettingsModel,
};

class Models {
  /**
   * Models constructor.
   * @param {object} [customModels] Custom models as { someModelName: SomeModelClass, anotherModelName: AnotherModelClass }.
   */
  constructor(customModels = {}, dbInstance) {
    // Define singleton.
    if (!Models.singleton) {
      this.initModels(customModels, dbInstance);
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

  getModel(name) {
    let model = this.models?.[name]?.model;
    if (!model) {
      throw new Error(`Model ${name} not found`);
    }

    return model;
  }

  /**
   * Init models.
   * @private
   * @param {object} [customModels] Custom models as { someModelName: SomeModelClass, anotherModelName: AnotherModelClass }.
   */
  initModels(customModels = {}, dbInstance) {
    // Define names of model classes.
    const namesOfModels = {
      workflowStatus: WorkflowStatusModel,
      workflowTemplateCategory: WorkflowTemplateCategoryModel,
      workflowTemplateTag: WorkflowTemplateTagModel,
      workflowTemplateTagMap: WorkflowTemplateTagMapModel,
      workflowTemplate: WorkflowTemplateModel,
      workflow: WorkflowModel,
      workflowError: WorkflowErrorModel,
      workflowRestart: WorkflowRestartModel,
      workflowHistory: WorkflowHistoryModel,
      workflowDebug: WorkflowDebugModel,
      taskTemplate: TaskTemplateModel,
      task: TaskModel,
      documentTemplate: DocumentTemplateModel,
      documentAttachment: DocumentAttachmentModel,
      documentSignature: DocumentSignatureModel,
      document: DocumentModel,
      event: EventModel,
      eventType: EventTypeModel,
      eventTemplate: EventTemplateModel,
      gateway: GatewayModel,
      gatewayType: GatewayTypeModel,
      gatewayTemplate: GatewayTemplateModel,
      unit: UnitModel,
      numberTemplate: NumberTemplateModel,
      customLog: CustomLogModel,
      customLogTemplate: CustomLogTemplateModel,
      accessHistory: AccessHistoryModel,
      unitRules: UnitRulesModel,
      uiFilter: UIFilterModel,
      customInterface: CustomInterfaceModel,
      proxyItem: ProxyItemModel,
      elasticReindexLog: ElasticReindexLog,
      favorites: FavoritesModel,
      snippets: SnippetsModel,
      snippetGroups: SnippetGroupsModel,
      massMessagesMailing: MassMessagesMailingModel,
      signatureRemovalHistory: SignatureRemovalHistory,
      additionalDataSignature: AdditionalDataSignatureModel,
      userSettings: UserSettingsModel,
      ...customModels,
    };

    // Init models.
    this.models = Object.entries(namesOfModels)
      .map((v) => [v[0], new v[1](dbInstance)])
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

    if (!dbInstance) {
      global.models = this.getModels();
    }
  }

  /**
   *  Models list
   */
  getModels() {
    return {
      ...this.models,
      getModel: this.getModel.bind(this),
    };
  }

  /**
   * Init relationships.
   * @private
   */
  initRelationships() {
    this.getModel('workflow').belongsTo(this.getModel('workflowTemplate'), {
      foreignKey: 'workflow_template_id',
      targetKey: 'id',
    });
    this.getModel('workflow').hasMany(this.getModel('task'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('workflow').hasMany(this.getModel('event'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('workflow').hasMany(this.getModel('gateway'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('workflow').hasMany(this.getModel('workflowError'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('workflow').hasMany(this.getModel('workflowRestart'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('workflowTemplate').belongsTo(this.getModel('workflowTemplateCategory'), {
      foreignKey: 'workflow_template_category_id',
      targetKey: 'id',
    });
    this.getModel('workflowTemplate').belongsToMany(this.getModel('workflowTemplateTag'), {
      as: 'tags',
      through: this.getModel('workflowTemplateTagMap'),
      foreignKey: 'workflowTemplateId',
      otherKey: 'workflowTemplateTagId',
    });
    this.getModel('workflowTemplateTag').belongsToMany(this.getModel('workflowTemplate'), {
      as: 'workflowTemplates',
      through: this.getModel('workflowTemplateTagMap'),
      foreignKey: 'workflowTemplateTagId',
      otherKey: 'workflowTemplateId',
    });
    this.getModel('task').belongsTo(this.getModel('document'), {
      foreignKey: 'document_id',
      targetKey: 'id',
    });
    this.getModel('task').belongsTo(this.getModel('workflow'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('task').belongsTo(this.getModel('taskTemplate'), {
      foreignKey: 'task_template_id',
      targetKey: 'id',
    });
    this.getModel('taskTemplate').belongsTo(this.getModel('documentTemplate'), {
      foreignKey: 'document_template_id',
      targetKey: 'id',
    });
    this.getModel('documentTemplate').belongsTo(this.getModel('taskTemplate'), {
      foreignKey: 'id',
      targetKey: 'document_template_id',
    });
    this.getModel('document').hasOne(this.getModel('task'), {
      foreignKey: 'document_id',
      targetKey: 'id',
    });
    this.getModel('document').belongsTo(this.getModel('documentTemplate'), {
      foreignKey: 'document_template_id',
      targetKey: 'id',
    });
    this.getModel('event').belongsTo(this.getModel('workflow'), {
      foreignKey: 'workflow_id',
      targetKey: 'id',
    });
    this.getModel('snippets').belongsTo(this.getModel('snippetGroups'), {
      foreignKey: 'snippet_group_name',
      targetKey: 'name',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
}

module.exports = Models;
