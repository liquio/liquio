import { ShareAccessModel } from './share_access';
import { AccessHistoryModel } from './access_history';
import { AdditionalDataSignatureModel } from './additional_data_signature';
import { DocumentSignatureModel } from './document_signature';
import { DocumentAttachmentModel } from './document_attachment';
import { DocumentTemplateModel } from './document_template';
import { DocumentModel } from './document';
import { EventTemplateModel } from './event_template';
import { EventTypeModel } from './event_type';
import { EventModel } from './event';
import { TaskModel } from './task';
import { TaskTemplateModel } from './task_template';
import { UnitModel } from './unit';
import { UserInboxModel } from './user_inbox';
import { WorkflowErrorModel } from './workflow_error';
import { WorkflowTemplateModel } from './workflow_template';
import { WorkflowModel } from './workflow';
import { CustomLogTemplateModel } from './custom_log_template';
import { CustomLogModel } from './custom_log';
import { RawQueryModel } from './raw_query';

export class Models {
  static singleton: Models;

  models: any;

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
    const namesOfModels: any = {
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
      .map((v: any) => [v[0], new v[1]()])
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

    // Set models as global.
    global.models = this.models;
  }
}
