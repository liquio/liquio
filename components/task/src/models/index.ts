// const DictionariesModel = require('./dictionaries');
import { WorkflowModel } from './workflow';
import { WorkflowTemplateCategoryModel } from './workflow_template_category';
import { WorkflowTemplateModel } from './workflow_template';
import { WorkflowErrorModel } from './workflow_error';
import { WorkflowRestartModel } from './workflow_restart';
import { TaskModel } from './task';
import { TaskTemplateModel } from './task_template';
import { DocumentModel } from './document';
import { DocumentAttachmentModel } from './document_attachment';
import { DocumentTemplateModel } from './document_template';
import { DocumentSignatureModel } from './document_signature';
import { DocumentSignatureRejectionModel } from './document_signature_rejection';
import { AdditionalDataSignatureModel } from './additional_data_signature';
import { UnitModel } from './unit';
import { UnitAccessModel } from './unit_access';
import { UserInboxModel } from './user_inbox';
import { NumberTemplateModel } from './number_template';
import { EventModel } from './event';
import { EventTemplateModel } from './event_template';
import { GatewayModel } from './gateway';
import { GatewayTemplateModel } from './gateway_template';
import { PaymentLogsModel } from './payment_logs';
import { CustomLogTemplateModel } from './custom_log_template';
import { CustomLogModel } from './custom_log';
import { AccessHistoryModel } from './access_history';
import { UIFilterModel } from './ui_filter';
import { CustomInterfaceModel } from './custom_interface';
import { WorkflowHistoryModel } from './workflow_history';
import { FavoritesModel } from './favorites';
import { ExternalServicesStatusesModel } from './external_services_statuses';
import { KycSessionModel } from './kyc_session';
import { CabinetMenuModel } from './cabinet_menu';

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
  ExternalServicesStatusesModel,
  KycSessionModel,
  CabinetMenuModel,
};

export class Models {
  private static singleton: Models;

  models: any;

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
      externalServicesStatuses: ExternalServicesStatusesModel,
      kycSession: KycSessionModel,
      cabinetMenu: CabinetMenuModel,
      ...customModels,
    };

    // Init models.
    this.models = (Object.entries(namesOfModels) as any[])
      .map((v) => [v[0], new v[1]()])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            const n: any = {};
            n[v[0]] = v[1];
            return n;
          })(),
        }),
        {},
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
    this.models.workflowTemplate.model.belongsTo(this.models.workflowTemplateCategory.model, {
      foreignKey: 'workflow_template_category_id',
      targetKey: 'id',
    });
    this.models.task.model.belongsTo(this.models.document.model, { foreignKey: 'document_id', targetKey: 'id' });
    this.models.task.model.belongsTo(this.models.workflow.model, { foreignKey: 'workflow_id', targetKey: 'id' });
    this.models.task.model.belongsTo(this.models.taskTemplate.model, { foreignKey: 'task_template_id', targetKey: 'id' });
    this.models.taskTemplate.model.belongsTo(this.models.documentTemplate.model, { foreignKey: 'document_template_id', targetKey: 'id' });
    this.models.documentTemplate.model.belongsTo(this.models.taskTemplate.model, { foreignKey: 'id', targetKey: 'document_template_id' });
    this.models.document.model.hasOne(this.models.task.model, { foreignKey: 'document_id', targetKey: 'id' });
  }
}
