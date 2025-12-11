import WorkflowBusiness from '../businesses/workflow';
import WorkflowTemplateBusiness from '../businesses/workflow_template';
import TaskBusiness from '../businesses/task';
import DocumentBusiness from '../businesses/document';
import RegisterBusiness from '../businesses/register';
import UserInboxBusiness from '../businesses/user_inbox';
import CustomBusiness from '../businesses/custom';
import ExternalServicesBusiness from '../businesses/external_services';

import WorkflowModel from '../models/workflow';
import WorkflowTemplateCategoryModel from '../models/workflow_template_category';
import WorkflowTemplateModel from '../models/workflow_template';
import WorkflowErrorModel from '../models/workflow_error';
import WorkflowRestartModel from '../models/workflow_restart';
import TaskModel from '../models/task';
import TaskTemplateModel from '../models/task_template';
import DocumentModel from '../models/document';
import DocumentAttachmentModel from '../models/document_attachment';
import DocumentTemplateModel from '../models/document_template';
import DocumentSignatureModel from '../models/document_signature';
import DocumentSignatureRejectionModel from '../models/document_signature_rejection';
import AdditionalDataSignatureModel from '../models/additional_data_signature';
import UnitModel from '../models/unit';
import UnitAccessModel from '../models/unit_access';
import UserInboxModel from '../models/user_inbox';
import NumberTemplateModel from '../models/number_template';
import EventModel from '../models/event';
import EventTemplateModel from '../models/event_template';
import GatewayModel from '../models/gateway';
import GatewayTemplateModel from '../models/gateway_template';
import PaymentLogsModel from '../models/payment_logs';
import CustomLogTemplateModel from '../models/custom_log_template';
import CustomLogModel from '../models/custom_log';
import AccessHistoryModel from '../models/access_history';
import UIFilterModel from '../models/ui_filter';
import CustomInterfaceModel from '../models/custom_interface';
import WorkflowHistoryModel from '../models/workflow_history';
import FavoritesModel from '../models/favorites';
import ExternalServicesStatusesModels from '../models/external_services_statuses';
import KycSessionModel from '../models/kyc_session';

import Log from '../lib/log';

import httpClient from '../lib/http_client';

declare global {
  var businesses: {
    workflow: WorkflowBusiness;
    workflowTemplate: WorkflowTemplateBusiness;
    task: TaskBusiness;
    document: DocumentBusiness;
    register: RegisterBusiness;
    userInbox: UserInboxBusiness;
    custom: CustomBusiness;
    externalServices: ExternalServicesBusiness;
  };

  var models: {
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
    customLogTemplate: CustomLogTemplateModel;
    customLog: CustomLogModel;
    accessHistory: AccessHistoryModel;
    uiFilter: UIFilterModel;
    customInterface: CustomInterfaceModel;
    workflowHistory: WorkflowHistoryModel;
    favorites: FavoritesModel;
    externalServicesStatuses: ExternalServicesStatusesModels;
    kycSession: KycSessionModel;
  };

  var log: Log;

  var httpClient: httpClient;
}

export {};
