import type { Log } from '@liquio/back-core';

import type { WorkflowBusiness } from '../businesses/workflow';
import type { WorkflowTemplateBusiness } from '../businesses/workflow_template';
import type { TaskBusiness } from '../businesses/task';
import type { DocumentBusiness } from '../businesses/document';
import type { RegisterBusiness } from '../businesses/register';
import type { UserInboxBusiness } from '../businesses/user_inbox';
import type { ExternalServicesBusiness } from '../businesses/external_services';
import type { WorkflowModel } from '../models/workflow';
import type { WorkflowTemplateCategoryModel } from '../models/workflow_template_category';
import type { WorkflowTemplateModel } from '../models/workflow_template';
import type { WorkflowErrorModel } from '../models/workflow_error';
import type { WorkflowRestartModel } from '../models/workflow_restart';
import type { TaskModel } from '../models/task';
import type { TaskTemplateModel } from '../models/task_template';
import type { DocumentModel } from '../models/document';
import type { DocumentAttachmentModel } from '../models/document_attachment';
import type { DocumentTemplateModel } from '../models/document_template';
import type { DocumentSignatureModel } from '../models/document_signature';
import type { DocumentSignatureRejectionModel } from '../models/document_signature_rejection';
import type { AdditionalDataSignatureModel } from '../models/additional_data_signature';
import type { UnitModel } from '../models/unit';
import type { UnitAccessModel } from '../models/unit_access';
import type { UserInboxModel } from '../models/user_inbox';
import type { NumberTemplateModel } from '../models/number_template';
import type { EventModel } from '../models/event';
import type { EventTemplateModel } from '../models/event_template';
import type { GatewayModel } from '../models/gateway';
import type { GatewayTemplateModel } from '../models/gateway_template';
import type { PaymentLogsModel } from '../models/payment_logs';
import type { PaymentCheckoutsModel } from '../models/payment_checkouts';
import type { PaymentTransactionsModel } from '../models/payment_transactions';
import type { CustomLogTemplateModel } from '../models/custom_log_template';
import type { CustomLogModel } from '../models/custom_log';
import type { AccessHistoryModel } from '../models/access_history';
import type { UIFilterModel } from '../models/ui_filter';
import type { CustomInterfaceModel } from '../models/custom_interface';
import type { WorkflowHistoryModel } from '../models/workflow_history';
import type { FavoritesModel } from '../models/favorites';
import type { ExternalServicesStatusesModel } from '../models/external_services_statuses';
import type { KycSessionModel } from '../models/kyc_session';
import type { HttpClient as httpClient } from './http_client';

type AppContext = {
  businesses?: {
    workflow: WorkflowBusiness;
    workflowTemplate: WorkflowTemplateBusiness;
    task: TaskBusiness;
    document: DocumentBusiness;
    register: RegisterBusiness;
    userInbox: UserInboxBusiness;
    externalServices: ExternalServicesBusiness;
  };
  models?: {
    workflow: WorkflowModel;
    workflowTemplateCategory: WorkflowTemplateCategoryModel;
    workflowTemplate: WorkflowTemplateModel;
    workflowError: WorkflowErrorModel;
    workflowRestart: WorkflowRestartModel;
    task: TaskModel;
    taskTemplate: TaskTemplateModel;
    document: DocumentModel;
    documentAttachment: DocumentAttachmentModel;
    documentTemplate: DocumentTemplateModel;
    documentSignature: DocumentSignatureModel;
    documentSignatureRejection: DocumentSignatureRejectionModel;
    additionalDataSignature: AdditionalDataSignatureModel;
    unit: UnitModel;
    unitAccess: UnitAccessModel;
    userInbox: UserInboxModel;
    numberTemplate: NumberTemplateModel;
    event: EventModel;
    eventTemplate: EventTemplateModel;
    gateway: GatewayModel;
    gatewayTemplate: GatewayTemplateModel;
    paymentLogs: PaymentLogsModel;
    paymentTransactions: PaymentTransactionsModel;
    paymentCheckouts: PaymentCheckoutsModel;
    customLogTemplate: CustomLogTemplateModel;
    customLog: CustomLogModel;
    accessHistory: AccessHistoryModel;
    uiFilter: UIFilterModel;
    customInterface: CustomInterfaceModel;
    workflowHistory: WorkflowHistoryModel;
    favorites: FavoritesModel;
    externalServicesStatuses: ExternalServicesStatusesModel;
    kycSession: KycSessionModel;
  };
  log?: Log;
  httpClient?: httpClient;
  config?: any;
  db?: any;
  redisClient?: any;
  redisClientCommonBpmn?: any;
  messageQueue?: any;
  typeOf?: any;
  moment?: any;
  JEST_ENV?: string;
};

const context: AppContext = {};

const setAppContext = (nextContext: AppContext = {}) => {
  Object.assign(context, nextContext);
};

const resetAppContext = () => {
  for (const key of Object.keys(context)) {
    delete context[key as keyof AppContext];
  }
};

const getBusinesses = () => context.businesses as NonNullable<AppContext['businesses']>;
const getModels = () => context.models as NonNullable<AppContext['models']>;
const getLog = () => context.log as Log;
const getHttpClient = () => context.httpClient as httpClient;
const getConfig = () => context.config;
const getDb = () => context.db;
const getRedisClient = () => context.redisClient;
const getRedisClientCommonBpmn = () => context.redisClientCommonBpmn;
const getMessageQueue = () => context.messageQueue;
const getTypeOf = () => context.typeOf;
const getMoment = () => context.moment;
const getJestEnv = () => context.JEST_ENV;

export {
  setAppContext,
  resetAppContext,
  getBusinesses,
  getModels,
  getLog,
  getHttpClient,
  getConfig,
  getDb,
  getRedisClient,
  getRedisClientCommonBpmn,
  getMessageQueue,
  getTypeOf,
  getMoment,
  getJestEnv,
};
