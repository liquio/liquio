import { WorkflowStatusModel } from './workflow_status';
import { WorkflowTemplateCategoryModel } from './workflow_template_category';
import { WorkflowTemplateModel } from './workflow_template';
import { WorkflowTemplateTagModel } from './workflow_template_tag';
import { WorkflowTemplateTagMapModel } from './workflow_template_tag_map';
import { WorkflowModel } from './workflow';
import { WorkflowErrorModel } from './workflow_error';
import { WorkflowRestartModel } from './workflow_restart';
import { WorkflowHistoryModel } from './workflow_history';
import { WorkflowDebugModel } from './workflow_debug';
import { TaskTemplateModel } from './task_template';
import { TaskModel } from './task';
import { DocumentTemplateModel } from './document_template';
import { DocumentAttachmentModel } from './document_attachment';
import { DocumentSignatureModel } from './document_signature';
import { DocumentModel } from './document';
import { EventModel } from './event';
import { EventTypeModel } from './event_type';
import { EventTemplateModel } from './event_template';
import { GatewayModel } from './gateway';
import { GatewayTypeModel } from './gateway_type';
import { GatewayTemplateModel } from './gateway_template';
import { UnitModel } from './unit';
import { NumberTemplateModel } from './number_template';
import { CustomLogModel } from './custom_log';
import { CustomLogTemplateModel } from './custom_log_template';
import { AccessHistoryModel } from './access_history';
import { UnitRulesModel } from './unit_rules';
import { UIFilterModel } from './ui_filter';
import { CustomInterfaceModel } from './custom_interface';
import { ProxyItemModel } from './proxy_item';
import { ElasticReindexLog } from './elastic_reindex_log';
import { FavoritesModel } from './favorites';
import { SnippetsModel } from './snippets';
import { SnippetGroupsModel } from './snippet_groups';
import { MassMessagesMailingModel } from './mass_messages_mailing';
import { SignatureRemovalHistory } from './signature_removal_history';
import { AdditionalDataSignatureModel } from './additional_data_signature';
import { UserSettingsModel } from './user_settings';

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

export class Models {
  static singleton: Models;

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
