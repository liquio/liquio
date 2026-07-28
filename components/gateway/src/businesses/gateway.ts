import { parse as parseJsonc } from 'jsonc-parser';

import { SystemNotifier } from '../lib/system_notifier';
import { Sandbox } from '../lib/sandbox';
import { GatewayTypeEntity } from '../entities/gateway_type';
import { WorkflowErrorModel } from '../models/workflow_error';
import { WorkflowDebugModel } from '../models/workflow_debug';
import { GatewayTypeModel } from '../models/gateway_type';
import { GatewayModel } from '../models/gateway';
import { GatewayTemplateModel } from '../models/gateway_template';
import { TaskModel } from '../models/task';
import { EventModel } from '../models/event';
import { WorkflowModel } from '../models/workflow';
import { WorkflowTemplateModel } from '../models/workflow_template';
import { WorkflowHistoryModel } from '../models/workflow_history';

// Constants.
const SYSTEM_USER = 'system';
const ERROR_WRONG_GATEWAY_TYPE = 'Wrong gateway type.';
const ERROR_WITHOUT_OUT_SEQUENCES = 'Gateway without any out sequences.';

/**
 * Gateway business.
 * @typedef {import('../entities/document')} DocumentEntity
 */
export class GatewayBusiness {
  static singleton: GatewayBusiness;
  config: any;
  sandbox: Sandbox;
  systemNotifier: SystemNotifier;
  workflowErrorModel: WorkflowErrorModel;
  workflowDebugModel: WorkflowDebugModel;
  gatewayTypeModel: GatewayTypeModel;
  gatewayModel: GatewayModel;
  gatewayTemplateModel: GatewayTemplateModel;
  taskModel: TaskModel;
  eventModel: EventModel;
  workflowModel: WorkflowModel;
  workflowTemplateModel: WorkflowTemplateModel;
  workflowHistoryModel: WorkflowHistoryModel;

  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
    // Define singleton.
    if (!GatewayBusiness.singleton) {
      this.config = config;
      this.sandbox = new Sandbox();
      this.systemNotifier = new SystemNotifier();
      this.workflowErrorModel = new WorkflowErrorModel();
      this.workflowDebugModel = new WorkflowDebugModel();
      this.gatewayTypeModel = new GatewayTypeModel();
      this.gatewayModel = new GatewayModel();
      this.gatewayTemplateModel = new GatewayTemplateModel();
      this.taskModel = new TaskModel();
      this.eventModel = new EventModel();
      this.workflowModel = new WorkflowModel();
      this.workflowTemplateModel = new WorkflowTemplateModel();
      this.workflowHistoryModel = new WorkflowHistoryModel();
      GatewayBusiness.singleton = this;
    }

    // Return singleton.
    return GatewayBusiness.singleton;
  }

  /**
   * Init.
   */
  async init() {}

  /**
   * Calc Parallel gateway data.
   * @param {object} jsonSchemaObject JSON schema object.
   * @param {string[]} sequenceIds Sequence ID list.
   * @returns {Promise<{resultSequences: string[]}>} Gateway data promise.
   */
  async calcParallelGatewayData(jsonSchemaObject: any, sequenceIds: string[]): Promise<any> {
    return { resultSequences: sequenceIds };
  }

  /**
   * Calc Exclusive gateway data.
   * @param {{formulas: {condition: string, isDefault: boolean}[]}} jsonSchemaObject JSON schema object. Sample: { formulas: [{ condition: "(documents) => { return true; }", isDefault: true }] }.
   * @param {string[]} sequenceIds Sequence ID list.
   * @param {DocumentEntity[]} documents Documents.
   * @param {EventEntity[]} events Events.
   * @returns {Promise<{resultSequence: string, sequenceIds: string[], condition: string, isDefault: boolean, handledAsDefault: boolean}>} Gateway data promise.
   */
  async calcExclusiveGatewayData(jsonSchemaObject: any, sequenceIds: string[], documents: any[], events: any[]): Promise<any> {
    // Check.
    const formulas = jsonSchemaObject.formulas;
    if (!Array.isArray(formulas)) {
      return {};
    }

    // Handle formulas.
    for (let i = 0; i < formulas.length; i++) {
      const formula = formulas[i];
      const { condition, isDefault } = formula;
      let conditionResult;
      try {
        conditionResult = this.sandbox.evalWithArgs(condition, [documents, events]);
      } catch (error: any) {
        global.log.save('condition-calculation-error', { error: error && error.message, condition, isDefault, documents, events });
        throw error;
      }
      if (conditionResult) {
        return { resultSequence: sequenceIds[i], sequenceIds, condition, isDefault, handledAsDefault: false };
      }
    }

    // Find default formula.
    const defaultFormulaIndex = formulas.findIndex((v: any) => v.isDefault);
    const defaultFormula = formulas[defaultFormulaIndex];
    const resultSequence = sequenceIds[defaultFormulaIndex];
    if (typeof defaultFormula === 'undefined' && typeof resultSequence === 'undefined') {
      throw new Error(ERROR_WITHOUT_OUT_SEQUENCES);
    }
    const { condition, isDefault } = defaultFormula;
    return { resultSequence, sequenceIds, condition, isDefault, handledAsDefault: true };
  }

  /**
   * Calc Inclusive gateway data.
   * @param {object} jsonSchemaObject JSON schema object.
   * @param {string[]} sequenceIds Sequence ID list.
   * @returns {Promise<{resultSequences: string[]}>} Gateway data promise.
   */
  async calcInclusiveGatewayData(jsonSchemaObject: any, sequenceIds: string[]): Promise<any> {
    return { resultSequences: sequenceIds };
  }

  /**
   * Create from message.
   * @param {object} messageObject AMQP message object.
   * @param {string} messageObject.workflowId Workflow ID.
   * @param {number} messageObject.gatewayTemplateId Gateway template ID.
   * @param {string[]} messageObject.sequenceIds Sequence ID list.
   */
  async createFromMessage(messageObject: any) {
    try {
      // Define params.
      const workflowId = messageObject.workflowId;
      const gatewayTemplateId = messageObject.gatewayTemplateId;
      let sequenceIds = messageObject.sequenceIds;
      if (!sequenceIds) {
        sequenceIds = await this.getSequenceIdsFromLatestGatewayInWorkflow(gatewayTemplateId, workflowId);
      }

      // Log.
      global.log.save('gateway-handling|message-parsed', { workflowId, gatewayTemplateId, sequenceIds });

      // Define gateway options.
      const gatewayTemplate = await this.gatewayTemplateModel.findById(gatewayTemplateId);
      const gatewayTypeId = gatewayTemplate.gatewayTypeId;
      const name = gatewayTemplate.name;
      const jsonSchema = gatewayTemplate.jsonSchema;
      const jsonSchemaObject = parseJsonc(jsonSchema || '{}');
      const gatewayType = await this.gatewayTypeModel.findById(gatewayTypeId);

      // Get current workflow documents.
      const { isCurrentOnly = true } = jsonSchemaObject;
      const taskDocumentsPromise = this.taskModel.getDocumentsByWorkflowId(workflowId, isCurrentOnly);
      const eventDocumentsPromise = this.eventModel.getDocumentsByWorkflowId(workflowId, isCurrentOnly);
      const events = await this.eventModel.getEventsByWorkflowId(workflowId);
      const documents = [...(await taskDocumentsPromise), ...(await eventDocumentsPromise)];

      // Prepare gateway data accordance to it's type.
      let data: any = {};
      switch (gatewayType.name) {
        case GatewayTypeEntity.Types.Parallel:
          data = await this.calcParallelGatewayData(jsonSchemaObject, sequenceIds);
          break;
        case GatewayTypeEntity.Types.Exclusive:
          data = await this.calcExclusiveGatewayData(jsonSchemaObject, sequenceIds, documents, events);
          break;
        case GatewayTypeEntity.Types.Inclusive:
          data = await this.calcInclusiveGatewayData(jsonSchemaObject, sequenceIds);
          break;
        default:
          throw new Error(ERROR_WRONG_GATEWAY_TYPE);
      }

      // If enabled debug model.
      if (typeof messageObject.debugId !== 'undefined') {
        // Save result.
        await this.workflowDebugModel.create({
          id: messageObject.debugId,
          workflowId,
          serviceName: 'gateway',
          data: { result: data, queueMessage: messageObject },
        });
      } else {
        const lastVersionWorkflowHistory = await this.workflowHistoryModel.findLastVersionByWorkflowTemplateId(messageObject.workflowTemplateId);

        // Save gateway.
        const createdGateway = await this.gatewayModel.create({
          gatewayTemplateId,
          workflowId,
          gatewayTypeId,
          name,
          data,
          createdBy: SYSTEM_USER,
          updatedBy: SYSTEM_USER,
          version: lastVersionWorkflowHistory && lastVersionWorkflowHistory.version,
        });
        if (!createdGateway) {
          throw new Error('Gateway wasn\'t created.');
        }

        // Log.
        global.log.save('gateway-handling|db-instance-created', { createdGateway });

        // Send message to RabbitMQ.
        const outMessage = { workflowId, gatewayId: createdGateway.id };

        global.messageQueue.produce(outMessage);
      }

      // Inform about handling status.
    } catch (error: any) {
      global.log.save('document-creating-by-message-from-queue-error', { messageObject });

      // If enabled debug model.
      if (typeof messageObject.debugId !== 'undefined' && messageObject && messageObject.workflowId) {
        await this.workflowDebugModel.create({
          id: messageObject.debugId,
          workflowId: messageObject.workflowId,
          serviceName: 'gateway',
          data: { error: error.message, queueMessage: messageObject },
        });
      } else {
        try {
          await this.workflowErrorModel.create({ error: error.message, queueMessage: messageObject });
          await this.workflowModel.setError(messageObject.workflowId);
        } catch (error: any) {
          global.log.save('workflow-id-not-found-error', { messageObject, error: error.message });
        }

        try {
          const workflowTemplate = await this.workflowTemplateModel.findIdAndNameAndErrorsSubscribersById(messageObject.workflowTemplateId);
          const gatewayTemplate = await this.gatewayTemplateModel.findIdAndNameById(messageObject.gatewayTemplateId);

          await this.systemNotifier.sendEmails({
            workflowId: messageObject.workflowId,
            workflowTemplateName: workflowTemplate?.name,
            workflowErrorsSubscribers: workflowTemplate?.errorsSubscribers,
            gatewayTemplateId: gatewayTemplate?.id,
            gatewayTemplateName: gatewayTemplate?.name,
            error: error?.message,
          });
        } catch (error: any) {
          global.log.save('system-notifier-error', error.message);
        }
      }
    }

    return true;
  }

  async getSequenceIdsFromLatestGatewayInWorkflow(gatewayTemplateId: number, workflowId: string) {
    const latestGatewayInWorkflow = await this.gatewayModel.getLatestGatewayInWorkflow(gatewayTemplateId, workflowId);
    const sequenceIds = latestGatewayInWorkflow?.data?.sequenceIds || [];

    global.log.save('get-sequence-ids-from-latest-gateway', {
      gatewayTemplateId,
      workflowId,
      sequenceIds,
      latestGatewayInWorkflow,
    });

    return sequenceIds;
  }
}
