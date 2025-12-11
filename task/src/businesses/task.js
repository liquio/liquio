const _ = require('lodash');
const moment = require('moment-business-days');
// eslint-disable-next-line no-unused-vars
const iconv = require('iconv-lite');
const SignatureInfoEntity = require('../entities/signature_info');
const SystemNotifier = require('../lib/system_notifier');
const Business = require('./business');
const DocumentFiller = require('../services/document_filler');
const StorageService = require('../services/storage');
const DocumentValidator = require('../services/document_validator');
const DocumentChecks = require('../services/document_checks');
const Assigner = require('../lib/assigner');
const NumberGenerator = require('../lib/number_generator');
const Auth = require('../services/auth');
const PropByPath = require('prop-by-path');
const Notifier = require('../services/notifier');
const { JSONPath } = require('../lib/jsonpath');
const PaymentService = require('../services/payment');
const NotifierService = require('../services/notifier');
const validator = require('validator');
const UnitModel = require('../models/unit');
const TaskActivity = require('../types/task_activity');
const CustomLogs = require('../services/custom_logs');
const Eds = require('../lib/eds');
const Helpers = require('../lib/helpers');
const Sandbox = require('../lib/sandbox');
const typeOf = require('../lib/type_of');
const OnboardingController = require('../controllers/onboarding');
const {
  InvalidSchemaError,
  BadRequestError,
  NotFoundError,
  SequelizeDbError,
  ForbiddenError,
  UnauthorizedError,
  EvaluateSchemaFunctionError,
  InternalServerError,
  InvalidParamsError,
} = require('../lib/errors');
const {
  ERROR_DRAFT_EXPIRED,
  ERROR_WORKFLOW_TEMPLATE_NOT_FOUND,
  ERROR_WORKFLOW_NOT_FOUND,
  ERROR_TASK_TEMPLATE_NOT_FOUND,
  ERROR_TASK_NOT_FOUND,
  ERROR_DOCUMENT_TEMPLATE_NOT_FOUND,
  ERROR_CAN_NOT_DELETE,
  ERROR_CREATE_TASK_ACCESS,
} = require('../constants/error');

// Constants.
const ONCE_DEFINED_META_FIELDS = ['commitRequestMeta'];
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const FIELDS_MAPPING = {
  performer_user_names: 'performer_usernames',
};
const CALCULATED_PAYMENT_INDICATOR = 'calculated';
const SIGNER_NAME_ERROR_UKR =
  'У вашому електронному ключі вказано ваше ПІБ {userName}, а ініціатор підписання документів - {performerName} - вказав {inSignerListName}. Зверніться, будь ласка, до ініціатора для виправлення помилки.';
const PERFORMER_NAME_ERROR = 'У вашому електронному ключі вказано ваше ПІБ {userName}, а в списку підписантів - {inSignerListName}.';
const SYSTEM_USER = 'system';
const REASSIGN_TRIGGER_ERROR = 'reassignTrigger error.';

const ERROR_TASK_ALREADY_COMMITTED = 'Task has already been committed.';
const ERROR_TASK_ACCESS = 'User doesn\'t have any access to task.';
const ERROR_USER_TASK_ACCESS_AS_UNIT_HEAD = 'User doesn\'t have access to task as unit head.';

/**
 * Task business.
 * @typedef {import('../entities/workflow')} WorkflowEntity
 * @typedef {import('../entities/task_template')} TaskTemplateEntity
 * @typedef {import('../entities/task')} TaskEntity
 * @typedef {import('../entities/document')} DocumentEntity
 * @typedef {import('../entities/event')} EventEntity
 * @typedef {import('../entities/unit')} UnitEntity
 */
class TaskBusiness extends Business {
  /**
   * Task business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!TaskBusiness.singleton) {
      super(config);
      this.eds = new Eds(config.eds);
      this.systemNotifier = new SystemNotifier();
      this.documentFiller = new DocumentFiller();
      this.documentChecks = new DocumentChecks();
      this.storageService = new StorageService();
      this.assigner = new Assigner(models.task, models.unit);
      this.numberGenerator = new NumberGenerator();
      this.auth = new Auth().provider;
      this.notifier = new Notifier();
      this.paymentService = new PaymentService(config.payment);
      this.notifierService = new NotifierService();
      this.unitModel = new UnitModel();
      this.mapping = config.mapping.taskBusiness;
      this.customLogs = new CustomLogs();
      this.sandbox = new Sandbox();
      this.onboarding = new OnboardingController(config);
      TaskBusiness.singleton = this;
    }
    return TaskBusiness.singleton;
  }

  /**
   * Get once defined meta fields.
   * @static
   * @returns {string[]} Once defined meta fields.
   * @example
   * TaskBusiness.OnceDefinedMetaFields;
   */
  static get OnceDefinedMetaFields() {
    return [...ONCE_DEFINED_META_FIELDS];
  }

  /**
   * Remove unsafe meta fields.
   * @param {TaskEntity.meta} meta Task meta.
   * @example
   * TaskBusiness.removeUnsafeMetaFields(meta);
   */
  removeUnsafeMetaFields(meta) {
    if (meta) {
      Object.keys(meta).forEach((key) => {
        if (TaskBusiness.OnceDefinedMetaFields.includes(key)) {
          delete meta[key];
        }
      });
    }
  }

  /**
   * Get task permissions.
   * @param {WorkflowEntity} workflow Workflow.
   * @param {TaskTemplateEntity} taskTemplate Task template entity.
   * @param {string} [creatorId] User ID.
   * @param {string} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units info.
   * @param {Array<number>} currentTaskPerformerUnitIds Task performer unit ids.
   * @param {TaskEntity.meta} meta Task meta.
   * @param {TaskEntity.activityLog} taskActivityLog Task activity log.
   * @returns {Promise<{performerUnits: number[], requiredPerformerUnits: number[], performerUsers: string[], performerUsersIpn: string[], performerUsersEmail: string[], signerUsers: string[], onlyForHeads: boolean}>} Task permissions promise.
   */
  async getTaskPermissions(workflow, taskTemplate, creatorId, user, units, currentTaskPerformerUnitIds, meta, taskActivityLog) {
    // Define params.
    const { id: workflowId } = workflow;
    const permissionsDescription = taskTemplate.jsonSchema.setPermissions || [];
    let taskPermissions = {
      performerUnits: [],
      requiredPerformerUnits: [],
      performerUsers: [],
      performerUsersIpn: [],
      performerUsersEmail: [],
      performerUsersName: [],
      signerUsers: [],
      onlyForHeads: false,
    };

    // Define documents and events from current workflow if need it.
    let documents;
    let events;
    if (
      permissionsDescription.some(
        (v) =>
          v &&
          (v.condition ||
            v.calcPerformerUnits ||
            v.calcRequiredPerformerUnits ||
            v.calcPerformerUsers ||
            v.calcPerformerUsersIpn ||
            v.calcPerformerUsersEmail ||
            v.calcPerformerUsersName ||
            v?.reassignTrigger?.calcPerformerUsers ||
            (typeof v?.performerUsersIsRandomHeadFromUnit === 'string' && v.performerUsersIsRandomHeadFromUnit.startsWith('(')) ||
            (typeof v?.performerUsersIsRandomMemberFromUnit === 'string' && v.performerUsersIsRandomMemberFromUnit.startsWith('('))),
      )
    ) {
      const useAllDocuments = permissionsDescription.some((v) => v && v.useAllDocuments);
      documents = await models.task.getDocumentsByWorkflowId(workflowId, !useAllDocuments, true);
      events = await models.event.getEventsByWorkflowId(workflowId);
    }

    // Handle all permissions description.
    for (const permissionDescription of permissionsDescription) {
      // Define params.
      const {
        performerUnits,
        requiredPerformerUnits,
        performerUsers,
        performerUsersIpn,
        performerUsersEmail,
        performerUsersName,
        signerUsers,
        condition,
        predictionPerformerUnits,
        predictionRequiredPerformerUnits,
        predictionPerformerUsers,
        predictionSignerUsers,
        onlyForHeads: onlyForHeadsRaw = false,
      } = permissionDescription;

      // Check condition if exists. Do not handle current permission description if condition exists and returns "false".
      try {
        if (
          condition &&
          !this.sandbox.evalWithArgs(condition, [documents], {
            meta: { fn: 'setPermissions.condition', workflowId: workflow.id },
          })
        ) {
          continue;
        }
      } catch (error) {
        log.save(
          'task-permission-condition-error',
          {
            error: error && error.message,
            workflowId,
            taskTemplate,
            condition,
          },
          'warn',
        );
        continue;
      }

      // Define only for heads indicator.
      const onlyForHeads =
        typeof onlyForHeadsRaw === 'string'
          ? this.sandbox.evalWithArgs(onlyForHeadsRaw, [workflow, documents], { meta: { fn: 'onlyForHeads', workflowId: workflow.id } })
          : !!onlyForHeadsRaw;

      // Prediction performer units.
      if (predictionPerformerUnits) {
        taskPermissions.performerUnits = [
          ...new Set([
            ...taskPermissions.performerUnits,
            ...(this.sandbox.evalWithArgs(predictionPerformerUnits, [workflow, documents], {
              meta: { fn: 'predictionPerformerUnits', workflowId: workflow.id },
            }) || []),
          ]),
        ];
      }

      // Prediction required performer units.
      if (predictionRequiredPerformerUnits) {
        taskPermissions.requiredPerformerUnits = [
          ...new Set([
            ...taskPermissions.requiredPerformerUnits,
            ...(this.sandbox.evalWithArgs(predictionRequiredPerformerUnits, [workflow, documents], {
              meta: { fn: 'predictionRequiredPerformerUnits', workflowId: workflow.id },
            }) || []),
          ]),
        ];
      }

      // Prediction performer users.
      if (predictionPerformerUsers) {
        taskPermissions.performerUsers = [
          ...new Set([
            ...taskPermissions.performerUsers,
            ...(this.sandbox.evalWithArgs(predictionPerformerUsers, [workflow, documents], {
              meta: { fn: 'predictionPerformerUsers', workflowId: workflow.id },
            }) || []),
          ]),
        ];
      }

      // Prediction signer users.
      if (predictionSignerUsers) {
        taskPermissions.signerUsers = [
          ...new Set([
            ...taskPermissions.signerUsers,
            ...(this.sandbox.evalWithArgs(predictionSignerUsers, [workflow, documents], {
              meta: { fn: 'predictionSignerUsers', workflowId: workflow.id },
            }) || []),
          ]),
        ];
      }

      // Define calculated performer units.
      let calculatedPerformerUnits = [];
      try {
        calculatedPerformerUnits = await this.assigner.calcPerformerUnits(
          workflow,
          documents,
          permissionDescription,
          user,
          units,
          events,
          currentTaskPerformerUnitIds,
          meta,
          taskActivityLog,
        );
      } catch (error) {
        const { message, stack } = error;
        log.save('calculated-performer-units-error', { error: { message, stack } }, 'warn');
      }

      // Define calculated required performer units.
      let calculatedRequiredPerformerUnits = [];
      try {
        calculatedRequiredPerformerUnits = await this.assigner.calcRequiredPerformerUnits(
          workflow,
          documents,
          permissionDescription,
          user,
          units,
          events,
          currentTaskPerformerUnitIds,
          meta,
          taskActivityLog,
        );
      } catch (error) {
        const { message, stack } = error;
        log.save('calculated-required-performer-units-error', { error: { message, stack } }, 'warn');
      }

      // Define calculated performer users.
      let calculatedPerformerUsers = [];
      let calculatedPerformerUsersIpn = [];
      let calculatedPerformerUsersEmail = [];
      let calculatedPerformerUsersName = [];
      try {
        const { ids, ipns, names, emails } = await this.assigner.calcPerformerUsers(
          workflow,
          documents,
          events,
          permissionDescription,
          currentTaskPerformerUnitIds,
          meta,
          taskActivityLog,
        );
        calculatedPerformerUsers = ids;
        calculatedPerformerUsersIpn = ipns;
        calculatedPerformerUsersEmail = emails;
        calculatedPerformerUsersName = names;
      } catch (error) {
        const { message, stack, cause } = error;
        log.save('calculated-performer-users-error', { error: { message, stack } }, 'warn');
        if (cause === REASSIGN_TRIGGER_ERROR) {
          throw error;
        }
      }

      // Handle current permission description.
      taskPermissions.onlyForHeads = taskPermissions.onlyForHeads || onlyForHeads;
      taskPermissions.performerUnits = [...new Set([...taskPermissions.performerUnits, ...(performerUnits || []), ...calculatedPerformerUnits])];
      taskPermissions.requiredPerformerUnits = [
        ...new Set([...taskPermissions.requiredPerformerUnits, ...(requiredPerformerUnits || []), ...calculatedRequiredPerformerUnits]),
      ];
      taskPermissions.performerUsers = [...new Set([...taskPermissions.performerUsers, ...(performerUsers || []), ...calculatedPerformerUsers])];
      taskPermissions.performerUsersIpn = [
        ...new Set([...taskPermissions.performerUsersIpn, ...(performerUsersIpn || []), ...calculatedPerformerUsersIpn]),
      ];
      taskPermissions.performerUsersEmail = [
        ...new Set([...taskPermissions.performerUsersEmail, ...(performerUsersEmail || []), ...calculatedPerformerUsersEmail]),
      ];
      taskPermissions.performerUserNames = [
        ...new Set([...taskPermissions.performerUsersName, ...(performerUsersName || []), ...calculatedPerformerUsersName]),
      ];
      taskPermissions.signerUsers = [...new Set([...taskPermissions.signerUsers, ...(signerUsers || [])])];
    }

    // Log.
    log.save('task-permissions-defined', { creatorId, taskPermissions });

    // Return task permissions.
    return taskPermissions;
  }

  /**
   * Calculate new task params.
   * @param {{taskName, documentName}} taskTemplateSchema Task template schema with optional params to calculate names.
   * @param {object} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units.
   * @param {{documents: object[], events: object[]}} documentsAndEvents Documents and events.
   * @param {object} appendToMeta Additional meta to append.
   * @returns {{worlflowName, taskName, documentName, createdByUnits, createdByUnitHeads, labels, meta}} Task and document names promise.
   */
  async calculateNewTaskParams(taskTemplateSchema, user, units, { documents, events }, appendToMeta = {}) {
    // Define input params.
    const {
      worlflowName: workflowNameSchema,
      taskName: taskNameSchema,
      documentName: documentNameSchema,
      createdByIpn: createdByIpnSchema,
      createdByUnits: createdByUnitsSchema,
      createdByUnitHeads: createdByUnitHeadsSchema,
      labels: labelsSchema,
      meta: metaFunction,
      copyPdfByDocumentId: copyPdfByDocumentIdFunction,
      copyPdfWithoutSignaturesByDocumentId: copyPdfWithoutSignaturesByDocumentIdFunction,
      copyAttachmentsByDocumentId: copyAttachmentsByDocumentIdFunction,
      copyAttachmentsWithoutSignaturesByDocumentId: copyAttachmentsWithoutSignaturesByDocumentIdFunction,
      copyPdfAsAttachmentByDocumentId: copyPdfAsAttachmentByDocumentIdFunction,
      filterCopyAttachmentsByFileIds: filterCopyAttachmentsByFileIdsFunction,
      copyAttachmentsByEventSavedDocumentId: copyAttachmentsByEventSavedDocumentIdFunction,
      copyAdditionalDataSignaturesByDocumentId: copyAdditionalDataSignaturesByDocumentIdFunction,
    } = taskTemplateSchema;
    const workflowNameSchemaIsFunction = typeof workflowNameSchema === 'string' && workflowNameSchema.startsWith('(');
    const taskNameSchemaIsFunction = typeof taskNameSchema === 'string' && taskNameSchema.startsWith('(');
    const documentNameSchemaIsFunction = typeof documentNameSchema === 'string' && documentNameSchema.startsWith('(');
    const createdByIpnSchemaIsFunction = typeof createdByIpnSchema === 'string' && createdByIpnSchema.startsWith('(');
    const createdByUnitsSchemaIsFunction = typeof createdByUnitsSchema === 'string' && createdByUnitsSchema.startsWith('(');
    const createdByUnitHeadsSchemaIsFunction = typeof createdByUnitHeadsSchema === 'string' && createdByUnitHeadsSchema.startsWith('(');
    const labelsSchemaIsFunction = typeof labelsSchema === 'string' && labelsSchema.startsWith('(');

    // Check if no need to calculate.
    if (
      !workflowNameSchemaIsFunction &&
      !taskNameSchemaIsFunction &&
      !documentNameSchemaIsFunction &&
      !createdByIpnSchemaIsFunction &&
      !createdByUnitsSchemaIsFunction &&
      !createdByUnitHeadsSchemaIsFunction &&
      !labelsSchemaIsFunction &&
      !metaFunction &&
      !copyPdfByDocumentIdFunction &&
      !copyPdfWithoutSignaturesByDocumentIdFunction &&
      !copyAttachmentsByDocumentIdFunction &&
      !copyAttachmentsByEventSavedDocumentIdFunction &&
      !copyAttachmentsWithoutSignaturesByDocumentIdFunction &&
      !copyPdfAsAttachmentByDocumentIdFunction &&
      !copyAdditionalDataSignaturesByDocumentIdFunction
    ) {
      return { taskName: taskNameSchema, documentName: documentNameSchema, meta: { ...appendToMeta } };
    }

    // Calculate names.
    let workflowName;
    try {
      workflowName =
        (workflowNameSchemaIsFunction &&
          this.sandbox.evalWithArgs(workflowNameSchema, [documents, user, units], {
            meta: { fn: 'calculateNewTaskParams.workflowName', taskTemplateSchema },
          })) ||
        workflowNameSchema;
    } catch (error) {
      log.save('can-not-define-workflow-name', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define workflow name.');
    }
    let taskName;
    try {
      taskName =
        (taskNameSchemaIsFunction &&
          this.sandbox.evalWithArgs(taskNameSchema, [documents, user, units], {
            meta: { fn: 'calculateNewTaskParams.taskName', taskTemplateSchema },
          })) ||
        taskNameSchema;
    } catch (error) {
      log.save('can-not-define-task-name', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define task name.');
    }
    let documentName;
    try {
      documentName =
        (documentNameSchemaIsFunction &&
          this.sandbox.evalWithArgs(documentNameSchema, [documents, user, units], {
            meta: { fn: 'calculateNewTaskParams.documentName', taskTemplateSchema },
          })) ||
        documentNameSchema;
    } catch (error) {
      log.save('can-not-define-document-name', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define document name.');
    }
    let createdByIpn;
    try {
      createdByIpn =
        (createdByIpnSchemaIsFunction &&
          this.sandbox.evalWithArgs(createdByIpnSchema, [documents, user, units, events], {
            meta: { fn: 'calculateNewTaskParams.createdByIpn', taskTemplateSchema },
          })) ||
        createdByIpnSchema;
    } catch (error) {
      log.save('can-not-define-created-by-ipn', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define created by ipn.');
    }
    let createdByUnits;
    try {
      createdByUnits =
        (createdByUnitsSchemaIsFunction &&
          this.sandbox.evalWithArgs(createdByUnitsSchema, [documents, user, units, events], {
            meta: { fn: 'calculateNewTaskParams.createdByUnits', taskTemplateSchema },
          })) ||
        createdByUnitsSchema;
    } catch (error) {
      log.save('can-not-define-created-by-units', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define created by units.');
    }
    let createdByUnitHeads;
    try {
      createdByUnitHeads =
        (createdByUnitHeadsSchemaIsFunction &&
          this.sandbox.evalWithArgs(createdByUnitHeadsSchema, [documents, user, units, events], {
            meta: { fn: 'calculateNewTaskParams.createdByUnitHeads', taskTemplateSchema },
          })) ||
        createdByUnitHeadsSchema;
    } catch (error) {
      log.save('can-not-define-created-by-unit-heads', {
        workflowNameSchema,
        error: (error && error.message) || error,
      });
      throw new Error('Can not define created by unit heads.');
    }
    let labels;
    try {
      labels =
        (labelsSchemaIsFunction &&
          this.sandbox.evalWithArgs(labelsSchema, [documents, user, units], { meta: { fn: 'calculateNewTaskParams.labels', taskTemplateSchema } })) ||
        labelsSchema;
    } catch (error) {
      log.save('can-not-define-labels', { workflowNameSchema, error: (error && error.message) || error });
      throw new Error('Can not define labels.');
    }

    // Calculate meta.
    let meta = {};
    try {
      meta =
        (metaFunction && this.sandbox.evalWithArgs(metaFunction, [documents], { meta: { fn: 'calculateNewTaskParams.meta', taskTemplateSchema } })) ||
        {};
    } catch (error) {
      log.save('can-not-calc-meta', { metaFunction, error: (error && error.message) || error });
      throw new Error('Can not calculate task meta.');
    }

    // Calculate copyPdfByDocumentId.
    let copyPdfByDocumentId;
    if (typeof copyPdfByDocumentIdFunction === 'string' && copyPdfByDocumentIdFunction.startsWith('(')) {
      try {
        copyPdfByDocumentId =
          copyPdfByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyPdfByDocumentIdFunction, [documents], {
            meta: { fn: 'calculateNewTaskParams.copyPdfByDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!documents.map((v) => v.id).includes(copyPdfByDocumentId)) {
          copyPdfByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-pdf', { copyPdfByDocumentIdFunction, error: (error && error.message) || error });
        throw new Error('Can not calculate task copy pdf.');
      }
    }

    // Calculate copyPdfWithoutSignaturesByDocumentId.
    let copyPdfWithoutSignaturesByDocumentId;
    if (typeof copyPdfWithoutSignaturesByDocumentIdFunction === 'string' && copyPdfWithoutSignaturesByDocumentIdFunction.startsWith('(')) {
      try {
        copyPdfWithoutSignaturesByDocumentId =
          copyPdfWithoutSignaturesByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyPdfWithoutSignaturesByDocumentIdFunction, [documents], {
            meta: { fn: 'calculateNewTaskParams.copyPdfWithoutSignaturesByDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!documents.map((v) => v.id).includes(copyPdfWithoutSignaturesByDocumentId)) {
          copyPdfWithoutSignaturesByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-pdf-without-signatures', {
          copyPdfWithoutSignaturesByDocumentIdFunction,
          error: (error && error.message) || error,
        });
        throw new Error('Can not calculate task copy pdf without signatures.');
      }
    }

    // Calculate copyAttachmentsByDocumentId.
    let copyAttachmentsByDocumentId;
    if (typeof copyAttachmentsByDocumentIdFunction === 'string' && copyAttachmentsByDocumentIdFunction.startsWith('(')) {
      try {
        copyAttachmentsByDocumentId =
          copyAttachmentsByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyAttachmentsByDocumentIdFunction, [documents], {
            meta: { fn: 'calculateNewTaskParams.copyAttachmentsByDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!documents.map((v) => v.id).includes(copyAttachmentsByDocumentId)) {
          copyAttachmentsByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-attachments-by-document-id', { copyAttachmentsByDocumentIdFunction, error: (error && error.message) || error });
        throw new Error('Can not calculate task copy attachments by document id.');
      }
    }

    // Calculate copyAttachmentsByEventId.
    let copyAttachmentsByEventSavedDocumentId;
    if (typeof copyAttachmentsByEventSavedDocumentIdFunction === 'string' && copyAttachmentsByEventSavedDocumentIdFunction.startsWith('(')) {
      try {
        copyAttachmentsByEventSavedDocumentId =
          copyAttachmentsByEventSavedDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyAttachmentsByEventSavedDocumentIdFunction, [events], {
            meta: { fn: 'calculateNewTaskParams.copyAttachmentsByEventSavedDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!events.map((v) => v.data?.result?.saveDocument?.savedDocument?.id).includes(copyAttachmentsByEventSavedDocumentId)) {
          copyAttachmentsByEventSavedDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-attachments-by-event-saved-document-id', {
          copyAttachmentsByEventSavedDocumentIdFunction,
          error: (error && error.message) || error,
        });
        throw new Error('Can not calculate task copy attachments by event saved document id.');
      }
    }

    // Calculate copyAttachmentsWithoutSignaturesByDocumentId.
    let copyAttachmentsWithoutSignaturesByDocumentId;
    if (
      typeof copyAttachmentsWithoutSignaturesByDocumentIdFunction === 'string' &&
      copyAttachmentsWithoutSignaturesByDocumentIdFunction.startsWith('(')
    ) {
      try {
        copyAttachmentsWithoutSignaturesByDocumentId =
          copyAttachmentsWithoutSignaturesByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyAttachmentsWithoutSignaturesByDocumentIdFunction, [documents]);
        // Security.
        if (!documents.map((v) => v.id).includes(copyAttachmentsWithoutSignaturesByDocumentId)) {
          copyAttachmentsWithoutSignaturesByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-attachments-without-signatures', {
          copyAttachmentsWithoutSignaturesByDocumentIdFunction,
          error: (error && error.message) || error,
        });
        throw new Error('Can not calculate task copy attachments without signatures.');
      }
    }

    // Calculate copyPdfAsAttachmentByDocumentId.
    let copyPdfAsAttachmentByDocumentId;
    if (typeof copyPdfAsAttachmentByDocumentIdFunction === 'string' && copyPdfAsAttachmentByDocumentIdFunction.startsWith('(')) {
      try {
        copyPdfAsAttachmentByDocumentId =
          copyPdfAsAttachmentByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyPdfAsAttachmentByDocumentIdFunction, [documents], {
            meta: { fn: 'calculateNewTaskParams.copyPdfAsAttachmentByDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!documents.map((v) => v.id).includes(copyPdfAsAttachmentByDocumentId)) {
          copyPdfAsAttachmentByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-pdf-as-attachment', { copyPdfAsAttachmentByDocumentIdFunction, error: (error && error.message) || error });
        throw new Error('Can not calculate task copy pdf as attachment.');
      }
    }

    // Calculate filterCopyAttachmentsByFileIds.
    let filterCopyAttachmentsByFileIds;

    if (typeof filterCopyAttachmentsByFileIdsFunction === 'string' && filterCopyAttachmentsByFileIdsFunction.startsWith('(')) {
      try {
        filterCopyAttachmentsByFileIds = this.sandbox.evalWithArgs(filterCopyAttachmentsByFileIdsFunction, [documents], {
          meta: { fn: 'calculateNewTaskParams.filterCopyAttachmentsByFileIds', taskTemplateSchema },
        });
        if (!Array.isArray(filterCopyAttachmentsByFileIds)) {
          throw new Error('Filter copy attachments by file ids must be an array.');
        }
      } catch (error) {
        log.save('can-not-calc-filter-copy-attachments', {
          filterCopyAttachmentsByFileIdsFunction,
          error: (error && error.message) || error,
        });
        throw new Error('Can not calculate task filter copy attachments.');
      }
    }

    // Calculate copyAdditionalDataSignaturesByDocumentId.
    let copyAdditionalDataSignaturesByDocumentId;
    if (typeof copyAdditionalDataSignaturesByDocumentIdFunction === 'string' && copyAdditionalDataSignaturesByDocumentIdFunction.startsWith('(')) {
      try {
        copyAdditionalDataSignaturesByDocumentId =
          copyAdditionalDataSignaturesByDocumentIdFunction &&
          this.sandbox.evalWithArgs(copyAdditionalDataSignaturesByDocumentIdFunction, [documents], {
            meta: { fn: 'calculateNewTaskParams.copyAdditionalDataSignaturesByDocumentId', taskTemplateSchema },
          });
        // Security.
        if (!documents.map((v) => v.id).includes(copyAdditionalDataSignaturesByDocumentId)) {
          copyAdditionalDataSignaturesByDocumentId = undefined;
        }
      } catch (error) {
        log.save('can-not-calc-copy-additional-data-signatures', {
          copyAdditionalDataSignaturesByDocumentIdFunction,
          error: (error && error.message) || error,
        });
        throw new Error('Can not calculate task copy additional data signatures.');
      }
    }

    // Return names.
    return {
      workflowName,
      taskName,
      documentName,
      createdByIpn,
      createdByUnits,
      createdByUnitHeads,
      labels,
      meta: { ...meta, ...appendToMeta },
      copyPdfByDocumentId,
      copyPdfWithoutSignaturesByDocumentId,
      copyAttachmentsByDocumentId,
      copyAttachmentsByEventSavedDocumentId,
      copyAttachmentsWithoutSignaturesByDocumentId,
      copyPdfAsAttachmentByDocumentId,
      filterCopyAttachmentsByFileIds,
      copyAdditionalDataSignaturesByDocumentId,
    };
  }

  async #assertOnboarding(userInfo) {
    if (
      config.onboarding?.onboardingTemplate?.workflowTemplateId &&
      config.onboarding?.onboardingTemplate?.taskTemplateId &&
      userInfo &&
      userInfo.onboardingTaskId
    ) {
      const isFinal = await models.workflow.getFinalityByTaskId(userInfo.onboardingTaskId);
      if (isFinal === undefined) {
        global.log.save('incorrect-current-onboarding-task-id', { onboardingTaskId: userInfo.onboardingTaskId });
      } else if (isFinal === false) {
        throw new BadRequestError('Onboarding workflow process should be finished.');
      }
    }
  }

  /**
   * Create.
   * @param {{workflowTemplateId, taskTemplateId, parentDocumentId, userInfo, userId, copyFrom, [isCreateByOtherSystem]: boolean, [isCreateFromRmqMessage]: boolean, originalDocument: {id, data}}} options Options.
   * @returns {Promise<TaskEntity>} Created task entity promise.
   */
  async create(options) {
    // Define params.
    let workflow;
    let { workflowId, taskTemplateId, createWorkflowId } = options;
    const {
      workflowTemplateId,
      workflowParentId,
      parentDocumentId,
      userInfo,
      userId,
      oauthToken,
      unitIds,
      userUnits,
      userUnitsEntities,
      performerUnits: performerUnitsFromSystemTask = [],
      requiredPerformerUnits: requiredPerformerUnitsFromSystemTask = [],
      performerUsers: performerUsersFromSystemTask = [],
      performerUsersIpn: performerUsersIpnFromSystemTask = [],
      performerUsersEmail: performerUsersEmailFromSystemTask = [],
      isCreateByOtherSystem = false,
      isCreateFromRmqMessage = false,
      enabledMocksHeader,
      isForwardedFromRegularUser,
      appendMeta,
    } = options;
    let { copyFrom, originalDocument, initData } = options;
    let isEntry = false;
    let copyPdfByDocumentId;
    let copyPdfWithoutSignaturesByDocumentId;
    let copyAttachmentsByDocumentId;
    let copyAttachmentsByEventSavedDocumentId;
    let copyAttachmentsWithoutSignaturesByDocumentId;
    let copyPdfAsAttachmentByDocumentId;
    let filterCopyAttachmentsByFileIds;
    let copyAdditionalDataSignaturesByDocumentId;

    // Check required params.
    if (!workflowTemplateId || !taskTemplateId) {
      throw new BadRequestError('Params workflowTemplateId and taskTemplateId are required.');
    }

    // Make sure that the user is not in the onboarding process.
    await this.#assertOnboarding(userInfo);

    // Create workflow.
    const workflowTemplate = await models.workflowTemplate.findById(workflowTemplateId);
    if (!workflowTemplate || workflowTemplate.isActive === false) {
      throw new NotFoundError(ERROR_WORKFLOW_TEMPLATE_NOT_FOUND);
    }

    // Get task template.
    const taskTemplate = await models.taskTemplate.findById(taskTemplateId);
    if (!taskTemplate) {
      throw new NotFoundError(ERROR_TASK_TEMPLATE_NOT_FOUND);
    }

    // Check if the task is a system task being created by a system user.
    // The `userInfo` param is present when the task is created via a browser call (TaskController.create).
    if (taskTemplate.jsonSchema?.isSystem === true && userInfo?.userId) {
      throw new ForbiddenError(ERROR_CREATE_TASK_ACCESS);
    }

    // Check task "isAIAssistant" really created by 'POST /tasks/by-other-system' route calling with passing regular user token.
    if (taskTemplate.jsonSchema?.isAIAssistant && !isForwardedFromRegularUser) {
      throw new UnauthorizedError('Regular user token must be passed in request headers.');
    }

    // Check task created by 'POST /tasks/by-other-system' with regular user token has "isAIAssistant: true" setting.
    if (isForwardedFromRegularUser && !taskTemplate.jsonSchema?.isAIAssistant) {
      throw new ForbiddenError(ERROR_CREATE_TASK_ACCESS);
    }

    if (!workflowId) {
      if (typeof taskTemplateId === 'undefined') {
        if (
          typeof workflowTemplate.data.entryTaskTemplateIds !== 'undefined' &&
          Array.isArray(workflowTemplate.data.entryTaskTemplateIds) &&
          workflowTemplate.data.entryTaskTemplateIds.length > 0
        ) {
          if (
            !Number.isInteger(workflowTemplate.data.entryTaskTemplateIds[0]) ||
            !(await businesses.workflow.hasTaskTemplateIdInBpmnSchema(
              workflowTemplate.xmlBpmnSchema,
              parseInt(workflowTemplate.data.entryTaskTemplateIds[0]),
            ))
          ) {
            log.save('workflow-entry-task-template-id-error', { workflowTemplate }, 'error');
            throw new Error('Invalid entryTaskTemplateId.');
          }
          taskTemplateId = workflowTemplate.data.entryTaskTemplateIds[0];
        }
      } else {
        // Check taskTemplateId.
        const entryTaskTemplateIds = businesses.workflowTemplate.prepareEntryTaskTemplateIds(
          workflowTemplate.data.entryTaskTemplateIds || [],
          userInfo,
          unitIds.all,
          userUnitsEntities,
        );
        if (
          !entryTaskTemplateIds.some((v) => v.id === parseInt(taskTemplateId)) ||
          !(await businesses.workflow.hasTaskTemplateIdInBpmnSchema(workflowTemplate.xmlBpmnSchema, parseInt(taskTemplateId)))
        ) {
          log.save('workflow-entry-task-template-id-error', { workflowTemplate, entryTaskTemplateIds, userInfo, unitIds, userUnits }, 'error');
          const error = new Error('Invalid entryTaskTemplateId.');

          if (workflowTemplate.data.disabledText) {
            error.details = {
              disabledText: workflowTemplate.data.disabledText,
            };
          }

          throw error;
        }
      }

      // Check workflow can be created by count limiter.
      await this.validateWorkflowByDraftsCountLimiter(userId, taskTemplateId, workflowTemplate);

      // Generate unique workflow number.
      let workflowNumber;
      if (typeof workflowTemplate.data.numberTemplateId !== 'undefined') {
        workflowNumber = await this.numberGenerator.generate(workflowTemplate.data.numberTemplateId);
      }
      // Rewrite the unique workflow number from the init data, if it is defined.
      if (typeOf(initData?.workflowNumber) === 'string') {
        workflowNumber = initData.workflowNumber;
      }

      const { name: userName, isLegal, isIndividualEntrepreneur } = userInfo || {};
      const userData = {
        userId,
        userName: userName || initData?.userName,
        isLegal,
        isIndividualEntrepreneur,
      };

      try {
        workflow = await models.workflow.create({
          id: createWorkflowId,
          workflowTemplateId,
          parentId: workflowParentId,
          userId: userId,
          userData,
          number: workflowNumber,
          createdByIpn: this.sandbox.evalWithArgs(workflowTemplate.data.createdByIpn, [userUnitsEntities], {
            defaultValue: undefined,
            meta: { fn: 'createWorkflow.createdByIpn', workflowId, taskTemplateId, createWorkflowId },
          }),
          createdByUnitHeads: this.sandbox.evalWithArgs(workflowTemplate.data.createdByUnitHeads, [userUnitsEntities], {
            defaultValue: [],
            meta: { fn: 'createWorkflow.createdByUnitHeads', workflowId, taskTemplateId, createWorkflowId },
          }),
          createdByUnits: this.sandbox.evalWithArgs(workflowTemplate.data.createdByUnits, [userUnitsEntities], {
            defaultValue: [],
            meta: { fn: 'createWorkflow.createdByUnits', workflowId, taskTemplateId, createWorkflowId },
          }),
          observerUnits: this.sandbox.evalWithArgs(workflowTemplate.data.observerUnits, [userUnitsEntities], {
            defaultValue: [],
            meta: { fn: 'createWorkflow.observerUnits', workflowId, taskTemplateId, createWorkflowId },
          }),
          isPersonal: this.sandbox.evalWithArgs(workflowTemplate.data.isPersonal, [userUnitsEntities], {
            defaultValue: true,
            meta: { fn: 'createWorkflow.isPersonal', workflowId, taskTemplateId, createWorkflowId },
          }),
        });
      } catch (error) {
        throw new SequelizeDbError(error);
      }

      workflowId = workflow.id;
      isEntry = true;
    }
    if (!workflow) {
      workflow = await models.workflow.findById(workflowId);
      if (!workflow) {
        throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
      }
    }

    // Append trace meta.
    this.appendTraceMeta({
      traceId: this.getTraceId(),
      taskTemplateId,
      workflowId,
    });

    // Copy document.
    const shouldCopy = taskTemplate.jsonSchema.allowCopy === undefined || taskTemplate.jsonSchema.allowCopy === true;
    let existingTask = await models.task.findCurrentTaskByWorkflowIdAndTaskTemplateID(workflowId, taskTemplateId);

    // If no task with isCurrent = true, find the latest created.
    if (!existingTask) {
      existingTask = await models.task.findLastTaskId(workflowId, taskTemplateId);
    }

    if (existingTask && shouldCopy) {
      copyFrom = existingTask.id;
      originalDocument = existingTask.document;
    }

    // Change is_current state to old if task created again.
    await models.task.changeIsCurrentStateToOld(taskTemplateId, workflowId);

    // Get documents and events from the current workflow.
    const documents = await models.task.getDocumentsByWorkflowId(workflowId).then(async (documents) =>
      Promise.all(
        documents.map(async (document) => {
          document.attachments = await models.documentAttachment.getByDocumentId(document.id);
          return document;
        }),
      ),
    );

    const events = await models.event.getEventsByWorkflowId(workflowId);

    // Get attachments by document id if copyAttachmentsByDocumentId passes.
    // if (copyAttachmentsByDocumentId && filterCopyAttachmentsByFileIds) {

    // Set task due date.
    let taskDueDate;
    const taskTemplateSchema = taskTemplate.jsonSchema;
    if (typeof taskTemplateSchema.deadline !== 'undefined') {
      // Set workflow due date.
      if (!workflow.dueDate && typeof workflowTemplate.data.deadline !== 'undefined') {
        const workflowDueDate = this.prepareDueDate(workflowTemplate.data.deadline, { documents, events });
        models.workflow.setDueDate(workflowId, workflowDueDate);
      }
      taskDueDate = this.prepareDueDate(taskTemplateSchema.deadline, { documents, events });
    }

    // Define task permissions.
    let {
      performerUnits,
      requiredPerformerUnits,
      performerUsers,
      performerUsersIpn,
      performerUsersEmail,
      signerUsers,
      onlyForHeads,
      performerUserNames: calculatedPerformerUserNames = [],
    } = await this.getTaskPermissions(workflow, taskTemplate, userId, userInfo, userUnitsEntities);

    if (performerUnitsFromSystemTask.length > 0) {
      performerUnits = performerUnitsFromSystemTask;
    }
    if (requiredPerformerUnitsFromSystemTask.length > 0) {
      requiredPerformerUnits = requiredPerformerUnitsFromSystemTask;
    }
    if (performerUsersFromSystemTask.length > 0) {
      performerUsers = performerUsersFromSystemTask;
    }
    if (performerUsersIpnFromSystemTask.length > 0) {
      performerUsersIpn = performerUsersIpnFromSystemTask;
    }
    if (performerUsersEmailFromSystemTask.length > 0) {
      performerUsersEmail = performerUsersEmailFromSystemTask;
    }

    // Calculate new task params.
    const {
      workflowName,
      taskName,
      createdByIpn,
      createdByUnits,
      createdByUnitHeads,
      labels,
      meta,
      copyPdfByDocumentId: calculatedCopyPdfByDocumentId,
      copyPdfWithoutSignaturesByDocumentId: calculatedCopyPdfWithoutSignaturesByDocumentId,
      copyAttachmentsByDocumentId: calculatedCopyAttachmentsByDocumentId,
      copyAttachmentsByEventSavedDocumentId: calculatedCopyAttachmentsByEventSavedDocumentId,
      copyAttachmentsWithoutSignaturesByDocumentId: calculatedCopyAttachmentsWithoutSignaturesByDocumentId,
      copyPdfAsAttachmentByDocumentId: calculatedCopyPdfAsAttachmentByDocumentId,
      filterCopyAttachmentsByFileIds: calculatedFilterCopyAttachmentsByFileIds,
      copyAdditionalDataSignaturesByDocumentId: calculatedCopyAdditionalDataSignaturesByDocumentId,
    } = await this.calculateNewTaskParams(taskTemplate.jsonSchema, userInfo, userUnitsEntities, { documents, events }, appendMeta);

    // Set workflow name if need it.
    if (workflowName) {
      await models.workflow.setName(workflowId, workflowName);
    }

    // Set createdByIpn if need it.
    if (createdByIpn) {
      const userDataByIpn = await this.auth.getUserByCode(createdByIpn, true);
      if (userDataByIpn) {
        await models.workflow.setCreatedBy(workflowId, userDataByIpn.userId);
      }
    }

    // Set createdByUnits if need it.
    if (createdByUnits) {
      await models.workflow.setCreatedByUnits(workflowId, createdByUnits);
    }

    // Set createdByUnitHeads if need it.
    if (createdByUnitHeads) {
      await models.workflow.setCreatedByUnitHeads(workflowId, createdByUnitHeads);
    }

    // Get performers usernames.
    const withPrivateProps = true;
    let performerUsersData;
    let performerUsersDataByIpn;
    let performerUsersDataByEmail;
    try {
      performerUsersData = (performerUsers || []).length > 0 ? await this.auth.getUsersByIds(performerUsers, withPrivateProps) : [];
      performerUsersDataByIpn = (performerUsersIpn || []).length > 0 ? await this.auth.getUserByCode(performerUsersIpn, withPrivateProps) : [];
      performerUsersDataByEmail = (performerUsersEmail || []).length > 0 ? await this.auth.getUserByEmail(performerUsersEmail, withPrivateProps) : [];
    } catch (error) {
      throw new Error(error);
    }

    // Define performers user names.
    const performerUserNames = performerUsersData.map((v) => v.name);
    const performerUserNamesByIpn = performerUsersDataByIpn.map((v) => v.name);
    const performerUserNamesByEmail = performerUsersDataByEmail.map((v) => v.name);

    // Normalize performer users.
    const performerUserIpnsByIpn = performerUsersDataByIpn.map((v) => v.ipn);
    const performerUserEmailsByEmail = performerUsersDataByEmail.map((v) => v.email);
    const performerUserIdsByIpn = performerUsersDataByIpn.map((v) => v.userId);
    const performerUserIdsByEmail = performerUsersDataByEmail.map((v) => v.userId);
    const normalizedPerformerUsers = [...performerUsers, ...performerUserIdsByIpn, ...performerUserIdsByEmail];
    const normalizedPerformerUsersByIpn = performerUsersIpn.filter((v) => !performerUserIpnsByIpn.includes(v));
    const normalizedPerformerUsersByEmail = performerUsersEmail.filter((v) => !performerUserEmailsByEmail.includes(v));
    const normalizedPerformerUsersNames = [
      ...calculatedPerformerUserNames,
      ...performerUserNames,
      ...performerUserNamesByIpn,
      ...performerUserNamesByEmail,
    ];

    // Get task JSON schema params.
    const { isSystem, isAIAssistant, hasInitData } = (taskTemplate && taskTemplate.jsonSchema) || {};

    const lastVersionWorkflowHistory = await models.workflowHistory.findLastVersionByWorkflowTemplateId(workflowTemplate.id);

    // Create task.
    let createdTask = await models.task.create({
      workflowId,
      taskTemplateId,
      userId: userId,
      performerUnits,
      requiredPerformerUnits,
      performerUsers: normalizedPerformerUsers,
      performerUsersIpn: normalizedPerformerUsersByIpn,
      performerUsersEmail: normalizedPerformerUsersByEmail,
      performerUserNames: normalizedPerformerUsersNames,
      signerUsers,
      onlyForHeads,
      dueDate: taskDueDate,
      isEntry,
      copyFrom,
      name: taskName,
      observerUnits: this.sandbox.evalWithArgs(workflowTemplate.data.observerUnits, [userUnitsEntities], {
        defaultValue: [],
        meta: { fn: 'createTask.observerUnits', workflowId, taskTemplateId, createWorkflowId },
      }),
      isSystem,
      labels: labels,
      meta: meta,
      version: lastVersionWorkflowHistory && lastVersionWorkflowHistory.version,
    });
    const taskId = createdTask.id;

    if (taskTemplate.documentTemplateId) {
      // Get document template.
      const documentTemplateId = taskTemplate.documentTemplateId;
      const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
      if (!documentTemplate) {
        throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
      }
      const documentTemplateJsonSchema = documentTemplate.jsonSchema;

      // Generate unique document number.
      let documentNumber;
      if (typeof taskTemplateSchema.numberTemplateId !== 'undefined') {
        documentNumber = await this.numberGenerator.generate(taskTemplateSchema.numberTemplateId);
      }

      // Create document and set link to document into task.
      const createdDocument = await models.document.create({
        documentTemplateId,
        parentDocumentId,
        userId,
        number: documentNumber,
      });
      const documentId = createdDocument.id;

      let documentData = createdDocument.data;

      // Variables from initData.
      if (initData && Object.keys(initData).length && (userId !== SYSTEM_USER || !isSystem)) {
        initData = {
          ...initData,
          copyPdfByDocumentId: undefined,
          copyPdfWithoutSignaturesByDocumentId: undefined,
          copyAttachmentsByDocumentId: undefined,
          copyAttachmentsByEventSavedDocumentId: undefined,
          copyAttachmentsWithoutSignaturesByDocumentId: undefined,
          copyPdfAsAttachmentByDocumentId: undefined,
          filterCopyAttachmentsByFileIds: undefined,
          copyAdditionalDataSignaturesByDocumentId: undefined,
        };
      } else {
        ({
          copyPdfByDocumentId,
          copyPdfWithoutSignaturesByDocumentId,
          copyAttachmentsByDocumentId,
          copyAttachmentsByEventSavedDocumentId,
          copyAttachmentsWithoutSignaturesByDocumentId,
          copyPdfAsAttachmentByDocumentId,
          filterCopyAttachmentsByFileIds = [],
          copyAdditionalDataSignaturesByDocumentId,
        } = initData || {});
      }

      // Calculated variables from task.
      if (calculatedCopyPdfByDocumentId) {
        copyPdfByDocumentId = calculatedCopyPdfByDocumentId;
      }
      if (calculatedCopyPdfWithoutSignaturesByDocumentId) {
        copyPdfWithoutSignaturesByDocumentId = calculatedCopyPdfWithoutSignaturesByDocumentId;
      }
      if (calculatedCopyAttachmentsByDocumentId) {
        copyAttachmentsByDocumentId = calculatedCopyAttachmentsByDocumentId;
      }
      if (calculatedCopyAttachmentsByEventSavedDocumentId) {
        copyAttachmentsByEventSavedDocumentId = calculatedCopyAttachmentsByEventSavedDocumentId;
      }
      if (calculatedCopyAttachmentsWithoutSignaturesByDocumentId) {
        copyAttachmentsWithoutSignaturesByDocumentId = calculatedCopyAttachmentsWithoutSignaturesByDocumentId;
      }
      if (calculatedCopyPdfAsAttachmentByDocumentId) {
        copyPdfAsAttachmentByDocumentId = calculatedCopyPdfAsAttachmentByDocumentId;
      }
      if (calculatedFilterCopyAttachmentsByFileIds) {
        filterCopyAttachmentsByFileIds = calculatedFilterCopyAttachmentsByFileIds;
      }
      if (calculatedCopyAdditionalDataSignaturesByDocumentId) {
        copyAdditionalDataSignaturesByDocumentId = calculatedCopyAdditionalDataSignaturesByDocumentId;
      }

      if (copyPdfByDocumentId) {
        await this.copyPdfByDocumentId(copyPdfByDocumentId, documentId);
      }
      if (copyPdfWithoutSignaturesByDocumentId) {
        await this.copyPdfByDocumentId(copyPdfWithoutSignaturesByDocumentId, documentId, true);
      }
      if (copyAttachmentsByDocumentId) {
        await this.copyAttachmentsByDocumentId(copyAttachmentsByDocumentId, documentId, filterCopyAttachmentsByFileIds);
      }
      if (copyAttachmentsByEventSavedDocumentId) {
        await this.copyAttachmentsByEventSavedDocumentId(copyAttachmentsByEventSavedDocumentId, documentId);
      }
      if (copyAttachmentsWithoutSignaturesByDocumentId) {
        await this.copyAttachmentsByDocumentId(copyAttachmentsWithoutSignaturesByDocumentId, documentId, filterCopyAttachmentsByFileIds, true);
      }
      if (copyPdfAsAttachmentByDocumentId) {
        await this.copyPdfAsAttachmentByDocumentId(copyPdfAsAttachmentByDocumentId, documentId);
      }
      if (copyAdditionalDataSignaturesByDocumentId) {
        await this.copyAdditionalDataSignaturesByDocumentId(copyAdditionalDataSignaturesByDocumentId, documentId);
      }

      // Define original document params.
      const { id: originalDocumentId, data: originalDocumentData } = originalDocument || {};
      if (copyFrom && originalDocumentId && originalDocumentData) {
        const { copyAttachmentsWithoutGenerated } = taskTemplateSchema;
        // Add new attachments.
        const attachmentsInfo = await this.copyAttachmentsByDocumentId(
          originalDocumentId,
          documentId,
          undefined,
          undefined,
          copyAttachmentsWithoutGenerated,
        );

        documentData = originalDocumentData;
        documentData = await this.replaceAttachmentsInfoInDocumentData(documentData, attachmentsInfo);
      }

      createdTask = await models.task.updateDocumentId(taskId, documentId);

      if ((isSystem || hasInitData) && initData && Object.keys(initData).length) {
        if (hasInitData) {
          // Check params using document schema.
          const { initParamsSchema } = documentTemplateJsonSchema;
          if (!initParamsSchema) {
            throw new Error('Can not find init params schema to verify task init data.');
          }

          for (const param in initData) {
            // Try to convert param to right type.
            if (initParamsSchema[param] === 'number') {
              if (isNaN(initData[param])) {
                throw new Error(`Init param: ${param} - convertation to type number error.`);
              }

              initData[param] = Number(initData[param]);
            }

            if (initParamsSchema[param] === 'boolean') {
              let booleanParam = initData[param] === 'true' ? true : initData[param] === 'false' ? false : undefined;

              if (!booleanParam) {
                throw new Error(`Init param: ${param} - convertation to type boolean error.`);
              }
              initData[param] = booleanParam;
            }
          }
        }

        const { documentFile, files, additionalDataSignatures, signatures, attachmentsSignatures } = initData;

        // Save external generated application PDF.
        if (documentFile) {
          if (documentFile.contentType.toLowerCase() === 'application/pdf') {
            await businesses.document.saveExternalPdf(documentFile, documentId, userId);
          }
        }

        // Get data from signatures and save as `signaturesInfo` into document data.
        if (Array.isArray(signatures) && signatures.length > 0) {
          const signaturesInfo = await this.getSignaturesInfo(signatures);
          delete initData.signatures;
          documentData.signaturesInfo = signaturesInfo;
        }

        // Save files.
        if (Array.isArray(files) && files.length > 0) {
          await businesses.document.createAttachmentsForSystemTask(files, documentId, userId, userUnits, true);
          const updatedDocument = await models.document.findById(documentId);
          initData.files = updatedDocument?.data?.initData?.files;
        }

        // Save additional data signatures.
        if (typeOf(additionalDataSignatures) === 'array' && additionalDataSignatures.length > 0) {
          await businesses.document.saveAdditionalDataSignatures(additionalDataSignatures, createdDocument, userId);
          delete initData.additionalDataSignatures;
        }

        // Save files as document attachments (with signatures).
        if (typeOf(attachmentsSignatures) === 'array' && attachmentsSignatures.length > 0) {
          try {
            const savedAttachments = await businesses.document.saveAttachmentsP7SSignatures(attachmentsSignatures, createdDocument, { userId });
            // Save attachment info to document.
            for (const [index, attachment] of savedAttachments.entries()) {
              // We need to get the updated document for correct saving attachment array.
              const documentToUpdate = await models.document.findById(documentId);
              await businesses.document.saveAttachmentToDocumentData(
                attachment,
                `initData.attachmentsSignatures.${index}`,
                documentToUpdate,
                userId,
                userUnits,
                true,
              );
            }
            const updatedDocument = await models.document.findById(documentId);
            initData.attachmentsSignatures = updatedDocument?.data?.initData?.attachmentsSignatures;
          } catch (error) {
            log.save('save-attachments-p7s-signatures-error', { error: (error && error.message) || error, taskId, documentId }, 'error');
            throw error;
          }
        }

        documentData.initData = initData;
      }

      // Fill defined values in created document and update.
      await this.documentFiller.fillDefinedValues(documentTemplateJsonSchema, documentData, {
        userInfo,
        userUnits,
        userUnitsEntities,
        oauthToken,
        workflowId,
        documentId,
        enabledMocksHeader,
      });

      const updatedDocument = await models.document.updateData(documentId, userId, documentData);

      // Check we mush delete task (draft) next time.
      if (documentTemplateJsonSchema?.draftDeleteCondition) {
        const { draftDeleteCondition: draftDeleteConditionString } = documentTemplateJsonSchema;
        const draftDeleteConditionFunction = this.sandbox.eval(draftDeleteConditionString);
        // TODO: Make sure that this condition can be reached after exception.
        if (typeof draftDeleteConditionFunction !== 'function') {
          const error = new Error('Param draftDeleteCondition must be a string of correct function.');
          log.save('draftDeleteCondition-error', error, 'error');
          throw error;
        }
        const willDeleteCurrentDraft = draftDeleteConditionFunction(documentData);
        await this.addTaskMetadata(createdTask, userId, false, { willDeleteCurrentDraft });
      }

      // Auto permanent delete if document don't passed checks.
      const documentChecksResult = this.documentChecks.checkAll(documentTemplateJsonSchema, documentData);
      if (documentChecksResult.isFailed) {
        delete documentChecksResult.isFailed;
        const updatedTask = await models.task.update(taskId, userId, { deleted: true });
        if (updatedTask.deleted) await this.deletePermanent(taskId, userId);
        throw new BadRequestError(documentChecksResult.message);
      }

      // Append created task object to return to user.
      createdTask.document = updatedDocument;

      // Create PDF for system or AIAssistant task.
      if (
        (isSystem || isAIAssistant) &&
        documentTemplateJsonSchema &&
        documentTemplateJsonSchema.pdfRequired &&
        typeof taskTemplate.jsonSchema.autoCommit !== 'undefined' &&
        taskTemplate.jsonSchema.autoCommit === true
      ) {
        createdTask.document.task = {
          workflowId: createdTask.workflowId,
        };
        await businesses.document.createPdf({ document: createdTask.document, userId });
      }
    }

    // Handle activity.
    await businesses.task.handleActivityTypeEvents(createdTask, 'TASK_CREATED');
    if (global.config.activity_log?.isEnabled) {
      const activity = new TaskActivity({
        type: 'TASK_CREATED',
        details: {
          createType: isCreateByOtherSystem ? 'BY_EXTERNAL_SYSTEM' : isCreateFromRmqMessage ? 'BY_SYSTEM' : 'BY_USER',
          systemName: isCreateByOtherSystem || isCreateFromRmqMessage ? userId : undefined,
          userId: !(isCreateByOtherSystem || isCreateFromRmqMessage) ? userId : undefined,
          userUnits: !(isCreateByOtherSystem || isCreateFromRmqMessage) ? Helpers.getUserUnits(userId) : undefined,
          assignedUsers: await Helpers.appendUnitIdsToUsers(createdTask.performerUsers),
          assignedUnits: createdTask.performerUnits,
        },
      });
      const taskWithCurrentActivityLog = await models.task.appendActivityLog(createdTask.id, activity);
      createdTask.activityLog = taskWithCurrentActivityLog.activityLog;
    }

    // Auto commit.
    if (typeof taskTemplate.jsonSchema.autoCommit !== 'undefined' && taskTemplate.jsonSchema.autoCommit === true) {
      const finishedTask = await this.setStatusFinished(taskId, userId, unitIds, undefined, undefined, undefined, {
        isCreateByOtherSystem,
        isCreateFromRmqMessage,
      });

      await businesses.userInbox.sendToInboxesIfNeedIt(finishedTask);

      // Send message to RabbitMQ.
      const message = { workflowId: finishedTask.workflowId, taskId: taskId };
      global.messageQueue.produce(message);
    }

    // Calculate draftExpiredAt and update task if need.
    await this.calculateAndUpdateDraftExpiredAt(createdTask, taskTemplate.jsonSchema);

    // Return saved task.
    return createdTask;
  }

  /**
   * Copy pdf by document ID.
   * @param {string} originalDocumentId Original document ID.
   * @param {string} documentCopyId Document copy ID.
   * @param {boolean} [withoutSignatures] Without signatures.
   */
  async copyPdfByDocumentId(originalDocumentId, documentCopyId, withoutSignatures = false) {
    const document = await models.document.findById(originalDocumentId);
    if (!document) {
      return;
    }

    const { fileId, fileName, fileType } = document;

    // Skip signatures.
    if (withoutSignatures) {
      const newFile = await this.storageService.provider.copyFile(fileId);

      if (newFile && newFile.id) {
        await models.document.addDocumentFile({ id: documentCopyId, fileId: newFile.id, fileName, fileType });
      } else {
        log.save('can-not-copy-file', {
          fileId,
          originalDocumentId,
          documentCopyId,
          newFile,
        });
      }
    } else {
      await models.document.addDocumentFile({ id: documentCopyId, fileId, fileName, fileType });
    }
  }

  /**
   * Copy attachments by document ID.
   * @param {string} originalDocumentId Original document ID.
   * @param {string} documentCopyId Document copy ID.
   * @param {string[]} filterByFileIds Filter by file IDs.
   * @param {boolean} [withoutSignatures] Without signatures.
   * @returns {Promise<{original, copy}>} Attachments info.
   */
  async copyAttachmentsByDocumentId(originalDocumentId, documentCopyId, filterByFileIds = [], withoutSignatures = false, withoutGenerated = false) {
    // Define original document attachments.
    let originalDocumentAttachments = await models.documentAttachment.getByDocumentId(originalDocumentId);

    // Copy attachments.
    let documentCopyAttachments = [];

    // Filter by file IDs.
    if (filterByFileIds.length) {
      originalDocumentAttachments = originalDocumentAttachments.filter((v) => filterByFileIds.includes(v.link));
    }

    // Filter by generated.
    if (withoutGenerated) {
      originalDocumentAttachments = originalDocumentAttachments.filter((v) => !v.isGenerated);
    }

    for (const originalDocumentAttachment of originalDocumentAttachments) {
      // Define original attachment params.
      const { link: originalLink, size, name, type, labels = [], meta = {} } = originalDocumentAttachment;

      // Skip signatures.
      if (withoutSignatures) {
        const newFile = await this.storageService.provider.copyFile(originalLink);

        if (newFile && newFile.id) {
          // Save attachments copy.
          const documentCopyAttachment = await models.documentAttachment.create({
            documentId: documentCopyId,
            link: newFile.id,
            name,
            type,
            size,
            isGenerated: false,
            isSystem: true,
            labels,
            meta,
          });

          documentCopyAttachments.push(documentCopyAttachment);
        } else {
          log.save('can-not-copy-file', {
            originalLink,
            originalDocumentId,
            documentCopyId,
            newFile,
          });
        }
      } else {
        // Save attachments copy.
        const documentCopyAttachment = await models.documentAttachment.create({
          documentId: documentCopyId,
          link: originalLink,
          name,
          type,
          size,
          isGenerated: false,
          isSystem: true,
          labels,
          meta,
        });

        documentCopyAttachments.push(documentCopyAttachment);
      }
    }

    // Return attachments info.
    const attachmentsInfo = {
      original: originalDocumentAttachments,
      copy: documentCopyAttachments,
    };
    return attachmentsInfo;
  }

  /**
   * Copy pdf as attachment by document ID.
   * @param {string} originalDocumentId Original document ID.
   * @param {string} documentCopyId Document copy ID.
   */
  async copyPdfAsAttachmentByDocumentId(originalDocumentId, documentCopyId) {
    const document = await models.document.findById(originalDocumentId);
    if (!document) {
      return;
    }

    const { fileId, fileName, fileType, fileSize = 0, labels = [], meta = {} } = document;

    await models.documentAttachment.create({
      documentId: documentCopyId,
      link: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      isGenerated: false,
      isSystem: true,
      labels,
      meta,
    });
  }

  /**
   * Copy attachments by event saved document ID.
   * @param {string} originalDocumentId Original document ID.
   * @param {string} documentCopyId Document copy ID.
   * @returns {Promise<{original, copy}>} Attachments info.
   */
  async copyAttachmentsByEventSavedDocumentId(originalDocumentId, documentCopyId) {
    const document = await models.document.findById(originalDocumentId);

    // Save attachments copy.
    const documentCopyAttachment = await models.documentAttachment.create({
      documentId: documentCopyId,
      link: document.fileId,
      name: document.fileName,
      type: document.fileType,
      size: document.fileSize,
      isGenerated: false,
      isSystem: true,
      labels: [],
      meta: {},
    });

    // Return attachments info.
    const attachmentsInfo = {
      original: document,
      copy: documentCopyAttachment,
    };
    return attachmentsInfo;
  }

  /**
   * Copy additional data signatures by document ID.
   * @param {string} originalDocumentId Original document ID.
   * @param {string} documentCopyId Document copy ID.
   */
  async copyAdditionalDataSignaturesByDocumentId(originalDocumentId, documentCopyId) {
    const additionalDataSignatures = await models.additionalDataSignature.getByDocumentId(originalDocumentId, 'asc');
    if (!additionalDataSignatures) {
      return;
    }

    for (const additionalDataSignature of additionalDataSignatures) {
      const data = { ...additionalDataSignature, documentId: documentCopyId };
      await models.additionalDataSignature.create(data);
    }
  }

  /**
   * Replace attachments info in document data.
   * @param {object} documentData Document data.
   * @param {Promise<{original, copy}>} attachmentsInfo Attachment info.
   */
  async replaceAttachmentsInfoInDocumentData(documentData, attachmentsInfo) {
    // Define params.
    const { original = [], copy = [] } = attachmentsInfo;

    // Define document data string.
    let documentDataString = JSON.stringify(documentData);

    // Handle accordance to attachments.
    for (let i = 0; i < original.length; i++) {
      // Define attachment items.
      const originalItem = original[i];
      const copyItem = copy[i];

      // Replace original item `id` and `link` to the same params of copy item.
      documentDataString = documentDataString.replace(new RegExp(originalItem.id, 'g'), copyItem.id);
      documentDataString = documentDataString.replace(new RegExp(originalItem.link, 'g'), copyItem.link);
      documentDataString = documentDataString.replace(new RegExp(originalItem.documentId, 'g'), copyItem.documentId);
    }

    // Create and return new document data object.
    const newDocumentData = JSON.parse(documentDataString);
    documentData = newDocumentData;
    return newDocumentData;
  }

  /**
   * Update.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @param {object} properties Properties.
   * @returns {Promise<TaskEntity>} Task entity.
   */
  async update(id, userId, userUnitIds, properties) {
    const task = await this.findByIdAndCheckAccess(id, userId, userUnitIds, true);
    if (!task) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }

    if (task.finished === true) {
      throw new BadRequestError(ERROR_TASK_ALREADY_COMMITTED);
    }

    const taskUpdated = await models.task.update(id, userId, properties);

    return taskUpdated;
  }

  /**
   * Get all user by ID and check acess.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {number[]} userHeadUnitIds User head unit IDs.
   * @param {object} params Params.
   * @param {{all: number[], head: number[], member: number[]}} allUserUnitIds User unit IDs.
   * @returns {Promise<{data: TaskEntity[]}>} Tasks entities.
   */
  async getAllByUserId(userId, userUnitIds, userHeadUnitIds, params, allUserUnitIds) {
    // Get tasks.
    const tasks = await models.task.getAllByUserId(userId, userUnitIds, userHeadUnitIds, {
      ...params,
    });

    for (let task of tasks.data) {
      const { name = null, description = null } = await businesses.workflow.getLastStepLabel(task.workflow);
      task.lastStepLabel = name;
      task.lastStepDescription = description;

      const userName = _.get(task, 'workflow.userData.userName');
      if (!userName) {
        const userNameFromTaskMeta = _.get(task, 'meta.user.name');
        _.set(task, 'workflow.userData.userName', userNameFromTaskMeta);
      }

      const isLegal = _.get(task, 'workflow.userData.isLegal');
      if (typeof isLegal === 'undefined') {
        const isLegalFromTaskMeta = _.get(task, 'meta.user.isLegal');
        _.set(task, 'workflow.userData.isLegal', isLegalFromTaskMeta);
      }

      const isIndividualEntrepreneur = _.get(task, 'workflow.userData.isIndividualEntrepreneur');
      if (typeof isIndividualEntrepreneur === 'undefined') {
        const isIndividualEntrepreneurFromTaskMeta = _.get(task, 'meta.user.isIndividualEntrepreneur');
        _.set(task, 'workflow.userData.isIndividualEntrepreneur', isIndividualEntrepreneurFromTaskMeta);
      }

      const companyName = _.get(task, 'workflow.userData.companyName');
      if (isLegal && !companyName) {
        const companyNameFromTaskMeta = _.get(task, 'meta.user.companyName');
        _.set(task, 'workflow.userData.companyName', companyNameFromTaskMeta);
      }

      if (params.filters?.extended_check_access?.is_clickable && task.taskTemplate?.jsonSchema?.extendedCheckAccess?.isClickable) {
        const isClickable = this.sandbox.evalWithArgs(
          task.taskTemplate.jsonSchema.extendedCheckAccess.isClickable,
          [
            {
              optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
              requestUserUnitIds: allUserUnitIds,
              currentTaskPerformerUnitIds: task.performerUnits,
              currentTaskPerformerUserIds: task.performerUsers,
              meta: task.meta,
              taskActivityLog: _.cloneDeep(task.activityLog),
            },
          ],
          { meta: { fn: 'task.taskTemplate.jsonSchema.extendedCheckAccess.isClickable', taskId: task.id } },
        );

        if (typeof isClickable !== 'boolean') {
          throw new InvalidSchemaError('extendedCheckAccess.isClickable must return a boolean value.');
        }

        task.meta.isClickable = isClickable;
      }
    }

    return tasks;
  }

  /**
   * Find by ID and check acess.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @param {boolean} [strict] Strict indicator. Signers do not have access if equals `true`.
   * @returns {Promise<TaskEntity>} Task entity.
   */
  async findByIdAndCheckAccess(id, userId, userUnitIds, strict = false) {
    // Get task.
    const task = await models.task.findById(id, {
      withWorkflow: ['id', 'workflow_template_id'], // we only need workflow template link
      withWorkflowTemplate: ['is_active'], // we only need to check if workflow template is active
    });
    if (!task) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }
    if (!task.workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }
    if (task.workflow.workflowTemplate.isActive === false && task.finished === false) {
      throw new BadRequestError('Workflow template is not active.');
    }

    // Check access.
    const hasAccess = task && (await task.hasAccess(userId, userUnitIds, strict));
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    task.deprecated = false;
    if (task.version !== null) {
      const lastVersionWorkflowHistory = await models.workflowHistory.findLastVersionByWorkflowTemplateId(task.workflow.workflowTemplateId);
      if (lastVersionWorkflowHistory && lastVersionWorkflowHistory.version) {
        const [majorVersionOfTask] = task.version.split('.').map((v) => parseInt(v));
        const [majorVersionOfWorkflow] = lastVersionWorkflowHistory.version.split('.').map((v) => parseInt(v));
        if (majorVersionOfTask !== majorVersionOfWorkflow) {
          task.deprecated = true;
        }
      }
    }

    // Append signatures and signatures rejections.
    const documentId = task && task.document && task.document.id;
    if (documentId) {
      const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
      task.document.signatures = documentSignatures;
      const documentSignatureRejections = await models.documentSignatureRejection.getByDocumentId(documentId);
      task.document.signatureRejections = documentSignatureRejections;
    }

    // Check access if multisigns.
    const signers = task.signerUsers;
    const performerUsers = task.performerUsers;

    const signatures = task.document && task.document.signatures;
    const signFromPerformers = signatures.filter((v) => performerUsers.includes(v.createdBy));
    const signersFromPerformers = signers.filter((v) => performerUsers.includes(v));
    if (
      signers.length &&
      !performerUsers.includes(userId) &&
      signFromPerformers.length !== performerUsers.length &&
      (signersFromPerformers.length > 0 || !task.data.signWithoutPerformerAvailable)
    ) {
      const error = new Error('Signer doesn\'t have access to task before performer sign it.');
      log.save('check-access-to-task-if-multisign-error', error, 'error');
      throw error;
    }

    const { declinedSignerIds } = task.meta || {};
    if (signers.length && declinedSignerIds && declinedSignerIds.includes(userId)) {
      const error = new Error('Signer don\'t have access to task - names not equal.');
      log.save('check-access-to-task-if-multisign-equal-names-error', error, 'error');
      throw error;
    }

    // Check extended check access.
    if (typeOf(task.taskTemplate?.jsonSchema?.extendedCheckAccess?.isHasViewAccess) === 'string') {
      const { isHasViewAccess } = task.taskTemplate.jsonSchema.extendedCheckAccess;

      if (!isHasViewAccess.startsWith('(')) {
        throw new InvalidSchemaError('extendedCheckAccess.isHasViewAccess should be a function.');
      }

      let userRoleUnits = {};
      if (global.config?.custom?.optionalProjectParams?.userRoleUnits) {
        const allUnits = await models.unit.getAll();
        userRoleUnits = allUnits.filter((unit) => Object.values(global.config.custom.optionalProjectParams.userRoleUnits).includes(unit.id));
      }
      let isHasViewAccessResult;
      try {
        isHasViewAccessResult = this.sandbox.evalWithArgs(
          isHasViewAccess,
          [
            {
              optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
              requestUserUnitIds: userUnitIds,
              requestUserId: userId,
              currentTaskPerformerUnitIds: task.performerUnits,
              currentTaskPerformerUserIds: task.performerUsers,
              meta: task.meta,
              taskActivityLog: _.cloneDeep(task.activityLog),
              userRoleUnits: userRoleUnits,
            },
          ],
          { meta: { fn: 'task.taskTemplate.jsonSchema.extendedCheckAccess.isHasViewAccess', taskId: id } },
        );
      } catch (error) {
        throw new EvaluateSchemaFunctionError('extendedCheckAccess.isHasViewAccess schema function throw error.', { cause: error.toString() });
      }

      if (typeOf(isHasViewAccessResult) !== 'boolean') {
        throw new InvalidSchemaError('extendedCheckAccess.isHasViewAccess should return a boolean value.');
      }

      if (!isHasViewAccessResult) {
        throw new ForbiddenError(ERROR_TASK_ACCESS);
      }
    }

    return task;
  }

  /**
   * Find by document ID as signer.
   * @param {string} documentId Document ID.
   * @param {string} userId User ID.
   * @returns {Promise<TaskEntity>} Task entity promise.
   */
  async findByDocumentIdAsSigner(documentId, userId) {
    // Get task.
    const task = await models.task.findByDocumentId(documentId);
    if (!task) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }

    // Check user is signer.
    if (!task.isSigner(userId)) {
      throw new ForbiddenError('User doesn\'t have access to task as signer.');
    }

    // Return task in other cases.
    return task;
  }

  /**
   * Create from message.
   * @param {object} messageObject AMQP message object.
   */
  async createFromMessage(messageObject) {
    if (messageObject.isCreateByOtherSystem && !this.checkCreateByOtherSystemFromMessage(messageObject)) return;
    // Create.
    try {
      const createdTask = await this.create({
        createWorkflowId: messageObject.createWorkflowId,
        workflowId: messageObject.workflowId,
        workflowTemplateId: messageObject.workflowTemplateId,
        taskTemplateId: messageObject.taskTemplateId,
        userId: messageObject.userId,
        workflowParentId: messageObject.workflowParentId,
        initData: messageObject.initData || {},
        unitIds: messageObject.unitIds || {},
        performerUnits: messageObject.performerUnits || [],
        requiredPerformerUnits: messageObject.requiredPerformerUnits || [],
        performerUsers: messageObject.performerUsers || [],
        performerUsersIpn: messageObject.performerUsersIpn || [],
        performerUsersEmail: messageObject.performerUsersEmail || [],
        isCreateFromRmqMessage: true,
        isCreateByOtherSystem: messageObject.isCreateByOtherSystem || false,
      });
      if (!createdTask) {
        throw new Error('Task wasn\'t created.');
      }
    } catch (error) {
      log.save('document-creating-by-message-from-queue-error', { messageObject, error: (error && error.message) || error, details: error.details });

      const { jsonSchema } = await models.taskTemplate.findById(messageObject.taskTemplateId);
      const retryInfo = this.getRetryInfo(messageObject, jsonSchema);
      if (retryInfo) {
        const { retryMessage, postponedTime } = retryInfo;
        if (typeof messageObject.onlyExecute === 'undefined') {
          // TODO: remove try-catch after testing.
          try {
            const channel = 'errors';
            const queueNames = {
              '10m': global.messageQueue.config.errorQueueName10M,
              '1h': global.messageQueue.config.errorQueueName1H,
              '2h': global.messageQueue.config.errorQueueName2H,
              '8h': global.messageQueue.config.errorQueueName8H,
              '1d': global.messageQueue.config.errorQueueName1D,
            };
            const queueName = queueNames[postponedTime] || queueNames['1d'];
            global.messageQueue.produce(retryMessage, channel, queueName);

            log.save('produce-retry-message-succes', { retryMessage, channel, queueName }); // TODO: remove this log after testing.
          } catch (error) {
            log.save('produce-retry-message-error', { retryMessage, error: error?.message }); // TODO: remove this log after testing.
          }
        }
      }

      try {
        const type = retryInfo ? 'warning' : 'error';
        await models.workflowError.create({ error: error.message, details: error.details, queueMessage: messageObject }, type);
        await models.workflow.setError(messageObject.workflowId);
      } catch (error) {
        log.save('workflow-id-not-found-error', { messageObject, error: error.message });
      }

      try {
        const workflowTemplate = await models.workflowTemplate.findById(messageObject.workflowTemplateId);
        const taskTemplate = await models.taskTemplate.findById(messageObject.taskTemplateId);

        await this.systemNotifier.sendEmails({
          workflowId: messageObject.workflowId,
          workflowTemplateName: workflowTemplate?.name,
          workflowErrorsSubscribers: workflowTemplate?.errorsSubscribers,
          taskTemplateId: taskTemplate?.id,
          taskTemplateName: taskTemplate?.name,
          error: error?.message,
        });
      } catch (error) {
        log.save('system-notifier-error', error.message, 'error');
      }
    }

    return true;
  }

  /**
   * Is commit available.
   * @param {DocumentEntity} document Document.
   * @param {object} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units Units.
   * @returns {Promise<boolean>} Is commit required indicator promise.
   */
  async isCommitAvailable(document, user, units) {
    // Define params.
    const { id: documentId, documentTemplateId } = document;

    // Get document JSON schema.
    const documentTemplate = await models.documentTemplate.findById(documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema: documentJsonSchema } = documentTemplate;

    // Define additional requirements.
    const { isCommitAvailable: isCommitAvailableFunction } = documentJsonSchema || {};

    // Check additional requirements not defined.
    if (typeof isCommitAvailableFunction !== 'string') {
      return true;
    }

    // Check additional requirements.
    let isCommitAvailable;
    try {
      isCommitAvailable = this.sandbox.evalWithArgs(isCommitAvailableFunction, [document, user, units], {
        meta: { fn: 'documentJsonSchema.isCommitAvailable', documentId },
      });
      log.save('commit-available-function-result', { documentId, isCommitAvailableFunction, isCommitAvailable });
    } catch (error) {
      log.save('commit-available-function-error', { documentId, isCommitAvailableFunction, error: error && error.message, document }, 'error');
      throw new Error('Commit available function error.');
    }

    // Return is commit available indicator.
    return isCommitAvailable;
  }

  /**
   * Set status finished.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @param {boolean} doNotCheckAccess
   * @param {object} [options] Additional options.
   * @param {object} [options.user] User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} [options.units] Units.
   * @param {object} [requestMeta] Request meta.
   * @return {Promise<TaskEntity>}
   */
  async setStatusFinished(id, userId, userUnitIds, doNotCheckAccess = false, { user, units } = {}, requestMeta = {}, options = {}) {
    const { isCreateByOtherSystem = false, isCreateFromRmqMessage = false } = options;
    // Get task.
    const task = await models.task.findById(id);
    if (!task || task.finished === true) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }

    // Check access.
    const isStrictAccess = false;
    const hasAccess = await task.hasAccess(userId, userUnitIds, isStrictAccess);
    if (!hasAccess && !doNotCheckAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    const [{ workflowTemplate }, taskTemplate] = await Promise.all([
      global.models.workflow.findById(task.workflowId),
      global.models.taskTemplate.findById(task.taskTemplateId),
    ]);

    // Check is entry task enabled
    if (task.isEntry) {
      const entryTaskTemplateIds = await businesses.workflowTemplate.prepareEntryTaskTemplateIds(
        workflowTemplate.data.entryTaskTemplateIds || [],
        user,
        userUnitIds.all,
        units,
      );

      if (!entryTaskTemplateIds.some(({ id }) => id === task.taskTemplateId)) {
        const error = new ForbiddenError('Entry task not active.');
        error.details = workflowTemplate.data.disabledText;

        throw error;
      }

      if (this.checkDraftExpired(task)) {
        throw new BadRequestError(ERROR_DRAFT_EXPIRED);
      }
    }

    // Check document by JSON schema.
    let jsonSchema = {};
    const { document } = task;
    if (document) {
      // Check commit available.
      const isCommitAvailable = await this.isCommitAvailable(document, user, units);
      if (!isCommitAvailable) {
        throw new Error('Commit not available.');
      }

      // Get document JSON schema.
      const templateId = document.documentTemplateId;
      const template = await models.documentTemplate.findById(templateId);
      if (!template) {
        throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
      }
      jsonSchema = template.jsonSchema;

      // Check generated PDF exists.
      const { pdfRequired } = jsonSchema;
      const { fileId: documentPdfFileId, data: documentData } = document;
      const { meta: taskMeta } = task;
      const documentPdfRequired = this.sandbox.evalWithArgs(pdfRequired, [documentData, taskMeta, task.activityLog], {
        checkArrow: true,
        meta: { fn: 'documentJsonSchema.pdfRequired', taskId: id, documentId: document.id },
      });
      if (documentPdfRequired && !documentPdfFileId) {
        throw new Error('Document PDF not generated.');
      }

      // Check additional data to sign.
      const { additionalDataToSign: additionalDataToSignFunction } = template;
      if (additionalDataToSignFunction) {
        const attachments = await models.documentAttachment.getByDocumentId(document.id);
        document.attachments = attachments;

        const getFileHash = businesses.document.getFileHash.bind(businesses.document, document);
        const getHash = businesses.document.getHash.bind(businesses.document);
        const getFileBase64 = businesses.document.getFileBase64.bind(businesses.document);
        const getP7sSignature = businesses.document.getP7sSignature.bind(this);

        const additionalDataSignatures = await models.additionalDataSignature.getByDocumentId(document.id);
        const additionalDataToSign = await this.sandbox.evalWithArgs(additionalDataToSignFunction, [document], {
          isAsync: true,
          global: { getFileHash, getHash, getFileBase64, getP7sSignature },
          meta: { fn: 'documentJsonSchema.additionalDataToSign', taskId: id, documentId: document.id },
        });

        const { signerUsers } = task;
        if (additionalDataSignatures.length !== additionalDataToSign.length * (signerUsers.length === 0 ? 1 : signerUsers.length)) {
          const error = new Error('Additional data signatures haven\'t found.');
          error.details = {
            additionalDataSignatures: additionalDataSignatures && additionalDataSignatures.map((v) => v.signature),
            additionalDataToSign,
          };
          throw error;
        }
      }

      // Check document is signed if need it.
      const { id: documentId } = document;
      const { signRequired, isP7sSign } = jsonSchema;
      let signRequiredIndicator;
      if (typeof signRequired === 'string' && signRequired.startsWith('(')) {
        try {
          signRequiredIndicator = this.sandbox.evalWithArgs(signRequired, [documentData, task.meta, task.activityLog], {
            meta: { fn: 'documentJsonSchema.signRequired', taskId: id, documentId },
          });
        } catch (error) {
          throw new EvaluateSchemaFunctionError('task.signRequired schema function throw error.', { cause: { error: error.toString() } });
        }
      } else {
        signRequiredIndicator = signRequired;
      }

      if (signRequiredIndicator) {
        // Define document signatures.
        const documentSignatures = await models.documentSignature.getByDocumentId(documentId);
        if (!Array.isArray(documentSignatures) || documentSignatures.length === 0) {
          throw new NotFoundError('Document signature not found.');
        }

        // Check p7s if need it.
        if (isP7sSign) {
          const { fileId } = document;
          const attachments = await models.documentAttachment.getByDocumentId(documentId);
          const attachesLinks = attachments.map((v) => v.link);

          const fileIds = attachesLinks ? [fileId, ...attachesLinks] : [fileId];
          let p7sMetaArray;
          try {
            p7sMetaArray = await this.storageService.provider.getP7sMetadata([...fileIds]);
          } catch (error) {
            log.save('commit|get-p7s-meta|error', { message: (error && error.message) || error });
            throw new Error('Can not get P7S meta.');
          }

          // Check if p7s exist.
          if (p7sMetaArray.length !== fileIds.length) {
            throw new Error('P7s required, can not commit.');
          }
        }

        // Check all signs.
        const signedDocument = { ...document, task, signatures: documentSignatures };
        const minSignaturesLimitInfo = await businesses.document.handleMinSignaturesLimit(signedDocument);
        const { isMinSignaturesLimitRaised = false } = minSignaturesLimitInfo || {};
        const { signerUsers } = task;
        if (Array.isArray(signerUsers) && signerUsers.length) {
          const signsCreatedBy = documentSignatures.map((v) => v.createdBy);
          const signersDifference = signerUsers.filter((v) => !signsCreatedBy.includes(v));
          if (signersDifference.length && !isMinSignaturesLimitRaised) {
            throw new Error('Can\'t commit - not all signers sign document.');
          }
        }
      }

      // Validate document.
      const documentValidator = new DocumentValidator(jsonSchema, {
        getFilteredRecordsByKeyId: businesses.register.getFilteredRecordsByKeyId.bind(businesses.register),
        getFilteredRecordsByKeyIdArguments: {
          userUnitIds: userUnitIds,
        },
      });
      const validationErrors = await documentValidator.check(document.data);
      if (validationErrors.length > 0) {
        const traceMeta = this.getTraceMeta();
        if (!traceMeta?.workflowId) {
          traceMeta.workflowId = task.workflowId;
        }
        await models.workflowError.create(
          {
            error: 'Validation error when try commit.',
            details: validationErrors,
            queueMessage: {},
            traceMeta,
          },
          'warning',
        );
        throw { message: 'Validation error.', details: validationErrors };
      }

      // Check if task has finished payment.
      const strictPaymentControlsPath = businesses.document.getStrictPaymentControlPath(jsonSchema);

      if (strictPaymentControlsPath.length) {
        for (const controlPath of strictPaymentControlsPath) {
          let hasPaidPayment = await this.hasFinishedPayment(task, controlPath);
          if (!hasPaidPayment) {
            throw new Error('Can not commit task! It has not been paid.');
          }
        }
      }

      // Check if document has paid hold payment to accept.
      const { isHoldPayment } = taskMeta || {};
      if (isHoldPayment) {
        try {
          await businesses.document.unholdPayment(document, taskMeta, jsonSchema, userId);
        } catch (error) {
          log.save('commit-task-unhold-payment-error');
          throw new Error(`Can not commit task - unhold payment error: ${error && error.message}`);
        }
      }
    }

    // Define performer users to append current user.
    const { performerUsers = [] } = task;
    if (!performerUsers.includes(userId)) {
      performerUsers.push(userId);
    }
    const { addTaskCommiterAsPerformer = true } = this.config.task_finish || {};
    const performerUsersToSet = addTaskCommiterAsPerformer ? performerUsers : undefined;

    // Get performers usernames.
    const withPrivateProps = false;
    let performerUsersData;
    try {
      performerUsersData =
        performerUsersToSet && performerUsersToSet.length > 0 ? await this.auth.getUsersByIds(performerUsersToSet, withPrivateProps) : [];
    } catch (error) {
      throw new Error(error);
    }
    const performerUserNamesToSet = performerUsersData.map((v) => v.name);

    const documents = await models.task.getDocumentsByWorkflowId(task.workflowId);
    const events = await models.event.getEventsByWorkflowId(task.workflowId);

    for (const document of documents) {
      document.attachments = await models.documentAttachment.getByDocumentId(document.id);
    }

    const { taskName, meta } = await this.calculateNewTaskParams(
      taskTemplate.jsonSchema,
      user,
      units,
      { documents, events },
      { commitRequestMeta: requestMeta },
    );

    // Check required email and phone fields while onboarding
    if (task?.taskTemplateId === config?.onboarding?.onboardingTemplate?.taskTemplateId) {
      const { userEmailRequired, userPhoneRequired } = jsonSchema;
      const emailsArr = performerUsersData.map((v) => v.email).filter(Boolean);
      const phonesArr = performerUsersData.map((v) => v.phone).filter(Boolean);

      const emailMissing = userEmailRequired && !emailsArr.length;
      const phoneMissing = userPhoneRequired && !phonesArr.length;

      let message = emailMissing && phoneMissing && 'E-mail and Phone additional validation required.';
      if (!message && emailMissing) message = 'E-mail additional validation required.';
      if (!message && phoneMissing) message = 'Phone additional validation required.';

      if (message) throw new BadRequestError(message);
    }

    // Add task meta.
    const overrideMeta = false;
    await this.addTaskMetadata(task, userId, overrideMeta, meta);

    // Check meta.handling.
    if (task?.meta?.handling) {
      const { handling } = task?.meta || {};

      // Check task.meta.handling contains all needed fields: 'timestamp', 'userId', 'userName'.
      const handlingRequiredFields = ['timestamp', 'userId', 'userName'];
      const handlingFields = Object.keys(handling);
      const isHandlingСontainsAllRequiredFields = handlingFields.length > 0 && handlingFields.every((key) => handlingRequiredFields.includes(key));

      if (!isHandlingСontainsAllRequiredFields) {
        const traceMeta = this.getTraceMeta();
        if (!traceMeta?.workflowId) {
          traceMeta.workflowId = task.workflowId;
        }
        await models.workflowError.create({ error: 'Try to commit task with unfilled meta.handling.', queueMessage: {}, traceMeta }, 'warning');
        throw new Error('Try to commit task with unfilled meta.handling.');
      }

      // Check that "handling user" commit the task.
      const normalizedName = (name) =>
        name
          .toLowerCase()
          .trim()
          .split(' ')
          .filter((v) => !!v)
          .join(' ');
      const { name, userId } = user;
      if (
        !task?.meta?.multiSignInfo && // If multiSign - do not check.
        (handling.userId !== userId || normalizedName(handling.userName) !== normalizedName(name))
      ) {
        const traceMeta = this.getTraceMeta();
        if (!traceMeta?.workflowId) {
          traceMeta.workflowId = task.workflowId;
        }
        await models.workflowError.create(
          {
            error: 'Try to commit task NOT handling user.',
            queueMessage: {},
            traceMeta,
            details: {
              handlingUserId: handling.userId,
              handlingUserName: handling.userName,
              currentUserId: userId,
              currentUserName: name,
            },
          },
          'warning',
        );
        throw new Error('Try to commit task NOT handling user.');
      }
    }

    // Check if need to set new workflow number.
    const { workflowNumber: workflowNumberFunction } = taskTemplate.jsonSchema;
    let newWorkflowNumber;
    if (workflowNumberFunction) {
      try {
        newWorkflowNumber = this.sandbox.evalWithArgs(workflowNumberFunction, [documents, events, user, units], {
          meta: { fn: 'taskTemplate.jsonSchema.workflowNumber', taskId: id },
        });
        if (typeof newWorkflowNumber !== 'string' && typeof newWorkflowNumber !== 'undefined') {
          throw new Error('Workflow number function must return a string or undefined.');
        }
      } catch (error) {
        log.save('commit-task|workflow-number-function-error', { error: error.message });
        throw error;
      }
    }
    if (typeof newWorkflowNumber === 'string') {
      await models.workflow.setNumber(task.workflowId, newWorkflowNumber);
    }

    // Set status finished and return.
    const finishedTask = await models.task.setStatusFinished(id, performerUsersToSet, performerUserNamesToSet, taskName);
    if (document) {
      await models.document.setStatusFinal(document.id);
    }

    // Handle activity.
    await this.handleActivityTypeEvents(task, 'TASK_COMMITTED');
    if (global.config.activity_log?.isEnabled) {
      const activity = new TaskActivity({
        type: 'TASK_COMMITTED',
        details: {
          commitType: isCreateByOtherSystem || isCreateFromRmqMessage ? 'AUTO_COMMIT_BY_SYSTEM' : 'BY_USER',
          systemName: isCreateByOtherSystem || isCreateFromRmqMessage ? userId : undefined,
          userId: !(isCreateByOtherSystem || isCreateFromRmqMessage) ? userId : undefined,
          userUnits: !(isCreateByOtherSystem || isCreateFromRmqMessage) ? Helpers.getUserUnits(userId) : undefined,
        },
      });
      const taskWithCurrentActivityLog = await models.task.appendActivityLog(task.id, activity);
      task.activityLog = taskWithCurrentActivityLog.activityLog;
    }

    // Set the workflow status.
    const workflowId = task.workflowId;
    const taskTemplateId = task.taskTemplateId;
    const taskId = task.id;
    try {
      await businesses.workflow.setWorkflowStatus(workflowId, workflowTemplate, parseInt(taskTemplateId), { documents, events });
    } catch (error) {
      log.save('set-workflow-status-error', { workflowId, error: error.message });
      await models.workflowError.create(
        {
          error: 'Can not set the workflow status.',
          details: {
            message: error.message,
          },
          traceMeta: {
            workflowId,
            taskId,
            taskTemplateId,
          },
          queueMessage: {},
        },
        'warning',
      );
    }

    // Check if task is onboarding
    if (user && user.onboardingTaskId === id) {
      // Mark user onboarding done
      // await this.auth.updateUserOnboarding(userId, { onboardingTaskId: '', needOnboarding: false });
      await this.onboarding.markUserOnboardingDone(userId, task);
    }

    return finishedTask;
  }

  /**
   * @param {Object} message
   * @return {Promise<boolean>}
   */
  async delayedAutoCommitFromMessage(message) {
    const { taskId } = message;

    const task = await models.task.findById(taskId);
    if (task.finished) {
      return true; // Tell RMQ server that we already processed that message.
    }

    // Save attribute in document data, for accessibility from schema.
    const document = await global.models.document.findById(task.documentId);
    PropByPath.set(document.data, 'isSystemDelayedAutoCommit', true);
    await global.models.document.updateData(task.documentId, 'system', document.data);

    // Commit document.
    await global.models.document.setStatusFinal(task.documentId);

    // Commit task.
    const finishedTask = await global.models.task.setStatusFinished(taskId);

    // Handle activity.
    await businesses.task.handleActivityTypeEvents(finishedTask, 'TASK_COMMITTED');
    if (global.config.activity_log?.isEnabled) {
      const activity = new TaskActivity({
        type: 'TASK_COMMITTED',
        details: {
          commitType: 'DELAYED_AUTO_COMMIT_BY_SYSTEM',
          systemName: 'system',
        },
      });
      await global.models.task.appendActivityLog(taskId, activity);
    }

    // Set the workflow status.
    const { workflowId, taskTemplateId } = finishedTask;
    const { workflowTemplate } = await global.models.workflow.findById(workflowId);
    const documents = await global.models.task.getDocumentsByWorkflowId(workflowId);
    const events = await global.models.event.getEventsByWorkflowId(workflowId);
    try {
      await global.businesses.workflow.setWorkflowStatus(workflowId, workflowTemplate, parseInt(taskTemplateId), {
        documents,
        events,
      });
    } catch (error) {
      log.save('task-business|delayed-auto-commit-from-message|set-workflow-status-error', {
        workflowId,
        error: error?.toString(),
      });
      await global.models.workflowError.create(
        {
          error: 'Can not set the workflow status.',
          details: {
            message: error.message,
          },
          traceMeta: {
            workflowId,
            taskId,
            taskTemplateId,
          },
          queueMessage: {},
        },
        'warning',
      );
    }

    // Send message to RabbitMQ.
    global.messageQueue.produce({ workflowId, taskId });

    return true; // Tell RMQ server that we processed that message.
  }

  /**
   * Set status deleted.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @param {object} options Options. force - for removed paid task.
   * @returns {{deleted: boolean, task}} Deleting result.
   */
  async delete(id, userId, { force }) {
    const task = await models.task.findById(id);

    // Check access.
    const hasAccess = task && (await task.hasAccess(userId));
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    const workflow = await models.workflow.findById(task.workflowId);
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    if (typeof workflow.data.messages !== 'undefined') {
      return false;
    }

    // Get document JSON schema.
    const documentTemplate = await models.documentTemplate.findById(task.document.documentTemplateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }

    // Check if the task has payment.
    const paymentControlPaths = [
      ...JSONPath('$..[?(@.control === \'payment\')]', documentTemplate.jsonSchema),
      ...JSONPath('$..[?(@.control === \'payment.widget\')]', documentTemplate.jsonSchema),
      ...JSONPath('$..[?(@.control === \'payment.widget.new\')]', documentTemplate.jsonSchema),
    ].map((v) => v.paymentControlPath);

    if (paymentControlPaths.length) {
      const { document } = task;
      const data = document && document.data;
      for (const controlPath of paymentControlPaths) {
        const paymentPath = controlPath.replace(/.properties./g, '.');
        const paymentData = PropByPath.get(data, paymentPath);

        if (
          paymentData &&
          paymentData.calculated &&
          paymentData.calculatedHistory &&
          paymentData.processed &&
          paymentData.processed.some((v) => v.status && v.status.isSuccess) &&
          !force
        ) {
          throw new Error('The task has been paid.');
        }
      }
    }

    await models.task.setStateDeleted(id, true);
    return { state: true, task };
  }

  /**
   * Delete permanent.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   */
  async deletePermanent(id, userId) {
    const task = await models.task.findById(id);

    // Check that document doesn't have signature.
    const documentSignature = await models.documentSignature.getByDocumentId(task.document.id);

    if (documentSignature.length > 0) {
      log.save('delete-permanent-by-task-id-error|document-has-signature', { id }, 'error');
      throw new Error('Error permanent deleting. Document has signature');
    }

    // Check access.
    const hasAccess = task && (await task.hasAccess(userId));
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    const workflow = await models.workflow.findById(task.workflowId);
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    if (task.deleted === false || typeof workflow.data.messages !== 'undefined') {
      throw new ForbiddenError(ERROR_CAN_NOT_DELETE);
    }

    try {
      await Promise.all([
        models.task.deleteById(id),
        models.documentAttachment.deleteByDocumentId(task.document.id),
        models.documentSignature.deleteByDocumentId(task.document.id),
        models.document.deleteById(task.document.id),
        models.workflow.deleteById(task.workflowId),
      ]);
    } catch {
      log.save('delete-permanent-by-task-id-error', { id }, 'error');
    }
  }

  /**
   * Set status deleted.
   * @param {string} id Task ID.
   * @param {string} userId User ID.
   * @returns {boolean}
   */
  async recover(id, userId) {
    const task = await models.task.findById(id);

    // Check access.
    const hasAccess = task && (await task.hasAccess(userId));
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    const workflow = await models.workflow.findById(task.workflowId);
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    if (typeof workflow.data.messages !== 'undefined') {
      return false;
    }

    await models.task.setStateDeleted(id, false);
    return true;
  }

  /**
   * Set signer users.
   * @param {string} id Task ID.
   * @param {string[]} signerUsers Signer users IDs.
   * @param {string} userId User ID. Used to check access.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs. Used to check access.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setSignerUsers(id, signerUsers, userId, userUnitIds) {
    // Get task.
    const task = await models.task.findById(id);

    // Check access.
    const signersDoNotHaveAccess = true;
    const hasAccess = task && (await task.hasAccess(userId, userUnitIds, signersDoNotHaveAccess));
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_TASK_ACCESS);
    }

    await models.taskTemplate.findById(task.taskTemplateId);
    if (this.checkDraftExpired(task)) {
      throw new BadRequestError(ERROR_DRAFT_EXPIRED);
    }

    // Set signer users.
    const updatedTask = models.task.setSignerUsers(id, signerUsers);
    return updatedTask;
  }

  /**
   * Set performer users.
   * @param {string} id Task ID.
   * @param {string[]} performerUsers Performer users IDs.
   * @param {string[]} userHeadUnitIds User head unit IDs. Used to check access.
   * @param {string} userId User ID.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setPerformerUsers(id, performerUsers, userHeadUnitIds, _userId) {
    // Get task.
    const task = await models.task.findById(id);

    // Check access.
    const hasAccess = task && task.isPerformerViaUnit(userHeadUnitIds);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_USER_TASK_ACCESS_AS_UNIT_HEAD);
    }

    // Update performerUserNames.
    const withPrivateProps = false;
    let performerUsersData;
    try {
      performerUsersData = await this.auth.getUsersByIds(performerUsers, withPrivateProps);
    } catch (error) {
      throw new Error(error);
    }
    const performerUserNames = performerUsersData.map((v) => v.name);

    // Set performer users.
    const updatedTask = models.task.setPerformerUsers(id, performerUsers, performerUserNames);

    // Save custom log.
    this.customLogs.saveCustomLog({
      operationType: 'performers-unassigned',
      performerUsers: task.performerUsers,
      performerUserNames: task.performerUserNames,
      performerUnits: task.performerUnits,
      requiredPerformerUnits: task.requiredPerformerUnits,
      workflowId: updatedTask.workflowId,
      task: updatedTask,
    });

    this.customLogs.saveCustomLog({
      operationType: 'performers-assigned',
      performerUsers: updatedTask.performerUsers,
      performerUserNames: updatedTask.performerUserNames,
      performerUnits: updatedTask.performerUnits,
      requiredPerformerUnits: updatedTask.requiredPerformerUnits,
      workflowId: updatedTask.workflowId,
      task: updatedTask,
    });

    return updatedTask;
  }

  /**
   * Set due date.
   * @param {string} id Task ID.
   * @param {string} dueDate Due date.
   * @param {string[]} userHeadUnitIds User head unit IDs. Used to check access.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setDueDate(id, dueDate, userHeadUnitIds) {
    // Get task.
    const task = await models.task.findById(id);
    if (!task || task.finished === true) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }

    // Check access.
    const hasAccess = task.isPerformerViaUnit(userHeadUnitIds);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_USER_TASK_ACCESS_AS_UNIT_HEAD);
    }

    // Set due date.
    const updatedTask = models.task.setDueDate(id, dueDate);
    return updatedTask;
  }

  /**
   * Add task metadata.
   * @param {object} taskData Task data.
   * @param {string} userId User Id.
   * @param {boolean} override Indicator to show override data or not.
   * @param {object} metaObj Meta obj.
   */
  async addTaskMetadata(task, userId, override, metaObj) {
    // Check if commited.
    if (task.finished === true) {
      throw new BadRequestError(ERROR_TASK_ALREADY_COMMITTED);
    }
    const taskId = task && task.id;

    // Define new task meta.
    const oldTaskMeta = task.meta || {};
    const oldTaskOnceDefinedMetaFields = Object.fromEntries(
      Object.entries(oldTaskMeta).filter(([key, value]) => TaskBusiness.OnceDefinedMetaFields.includes(key) && value),
    );
    const safeMetaObj = { ...metaObj, ...oldTaskOnceDefinedMetaFields };
    let newTaskMeta = oldTaskMeta;
    if (!oldTaskMeta || (oldTaskMeta && override)) {
      newTaskMeta = safeMetaObj;
    } else {
      for (let prop in safeMetaObj) {
        newTaskMeta[prop] = safeMetaObj[prop];
      }
    }

    // Update task.
    const updateTaskMetaObj = { meta: task.meta };

    // Update task meta.
    const updatedTask = await models.task.update(taskId, userId, updateTaskMetaObj);
    return updatedTask;
  }

  /**
   * Calculate signers.
   * @param {string} taskId Task Id.
   * @param {string} multisignerSchemaPath Multisigner schema path.
   * @param {string} userId User Id.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @param {object} userInfo User info.
   */
  async calcSigners(taskId, multisignerSchemaPath, userId, userUnitIds, userInfo) {
    // Get task and check access.
    const task = await this.findByIdAndCheckAccess(taskId, userId, userUnitIds);
    if (!task) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }
    const userIpn = userInfo.ipn;

    // Get document JSON schema.
    const { document } = task;
    let jsonSchema;
    if (document) {
      const templateId = document.documentTemplateId;
      const template = await models.documentTemplate.findById(templateId);
      if (!template) {
        throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
      }
      jsonSchema = template.jsonSchema;
    }
    if (this.checkDraftExpired(task)) {
      throw new BadRequestError(ERROR_DRAFT_EXPIRED);
    }

    // Get formula to calculate signers.
    const multisignerControl = PropByPath.get(jsonSchema && jsonSchema.properties, multisignerSchemaPath);
    if (!multisignerControl || typeof multisignerControl !== 'object') {
      throw new Error('Can not find control to calculate signers in JSON schema.');
    }
    const calcSignersFormula = multisignerControl.calcSigners;
    if (!calcSignersFormula || typeof calcSignersFormula !== 'string' || !calcSignersFormula.startsWith('(')) {
      log.save('multisigners-get-calculate-formula-error', { taskId, userId, calcSignersFormula }, 'error');
      throw new Error('Can not find formula to calculate signers in JSON schema.');
    }

    const signersArray = this.sandbox.evalWithArgs(calcSignersFormula, [document], { meta: { fn: 'multisigners.calcSigners', taskId } });
    if (!signersArray) {
      log.save('multisigners-calculate-signers-by-formula-error', { taskId, userId, calcSignersFormula }, 'error');
      throw new Error('Can\'t calculate signers by formula.');
    } else {
      log.save('multisigners-calculate-signers-by-formula', { taskId, userId, signersArray });
    }

    // Check for IPN duplicates.
    const isIpnDuplicates = signersArray.map((v) => {
      return signersArray.some((el) => el.ipn === v.ipn && el.lastName !== v.lastName && el.firstName !== v.firstName);
    });

    if (isIpnDuplicates.some((v) => v === true)) {
      throw new Error('Found duplicates ipn. Can not create signers list.');
    }

    // Check user fill user's name correctly.
    const userFromSigners = signersArray.find((v) => v.ipn === userIpn);
    if (!jsonSchema.isContinueSignAvailable) {
      if (!userFromSigners) {
        throw new Error('User should be in signers list.');
      }
      if (
        typeof userFromSigners.firstName !== 'string' ||
        userFromSigners.firstName.toUpperCase() !== userInfo.firstName.toUpperCase() ||
        typeof userFromSigners.lastName !== 'string' ||
        userFromSigners.lastName.toUpperCase() !== userInfo.lastName.toUpperCase() ||
        (typeof userFromSigners.middleName === 'string' &&
          typeof userInfo.middleName === 'string' &&
          userFromSigners.middleName.toUpperCase() !== userInfo.middleName.toUpperCase()) ||
        (!userFromSigners.middleName && userInfo.middleName)
      ) {
        // Prepare options.
        const userName = `${userInfo.lastName} ${userInfo.firstName}${userInfo.middleName ? ' ' + userInfo.middleName : ''}`;
        const inSignerListName = `${userFromSigners.lastName} ${userFromSigners.firstName}${
          userFromSigners.middleName ? ' ' + userFromSigners.middleName : ''
        }`;

        // Translate message.
        let messageUkr = PERFORMER_NAME_ERROR;
        const options = { userName, inSignerListName };
        for (const key in options) {
          const replacePattern = new RegExp(`\\{${key}\\}`, 'g');
          messageUkr = messageUkr.replace(replacePattern, options[key]);
        }
        const error = new Error(messageUkr);
        throw error;
      }
    }

    for (const signer of signersArray) {
      const ipn = signer.ipn;
      const email = signer.email;

      const isIpnCode = typeof ipn === 'string' && ipn.match(/^\d{10}$/); // IPN code should be exactly 10 digits
      const isEdrpouCode = typeof ipn === 'string' && ipn.match(/^\d{8}$/); // EDRPOU should be 8 digits
      const ukrPassportPattern = /^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]{2}\d{6}/;
      const isPassport = typeof ipn === 'string' && ipn.match(ukrPassportPattern); // Passport should be 2 ukrainian letters followed by 6 digits
      const isIdCardNumber = typeof ipn === 'string' && ipn.match(/^\d{9}$/); // ID Card Number should be 9 digits

      // Cases separating legal and individual users. <ipn>-<edrpou> (1234567890-87654321) OR <id-card>-<edrpou> (123456789-87654321) OR <passport>-<edrpou> (АФ123456-87654321).
      const isIpnCodeAndEdrpou = typeof ipn === 'string' && ipn.match(/^\d{10}-\d{8}$/); // Example: 1234567890-87654321
      const isPassportAndEdrpou = typeof ipn === 'string' && ipn.match(new RegExp(ukrPassportPattern.source + '-\\d{8}$')); // Example: ФЇ123456-87654321
      const isIdCardNumberAndEdrpou = typeof ipn === 'string' && ipn.match(/^\d{9}-\d{8}$/); // Example: 123456789-87654321

      const isEmailValid = validator.isEmail(email); // Validating email format

      if (
        (!isIpnCode && !isEdrpouCode && !isPassport && !isIdCardNumber && !isIpnCodeAndEdrpou && !isPassportAndEdrpou && !isIdCardNumberAndEdrpou) ||
        !isEmailValid
      ) {
        log.save('multisigners-check-ipn-email-error', { taskId, userId, signersArray, signer }, 'error');
        throw new Error('Incorrect ipn or email');
      }
    }

    // Find or create signers.
    const signersInfoPromise = signersArray.map((v) => this.auth.prepareUser(null, null, null, v.ipn, v.email));
    const signersInfo = await Promise.all(signersInfoPromise);
    const signers = signersInfo.filter((v) => v !== undefined);

    if (signers.length !== signersArray.length) {
      log.save('multisigners-find-create-signers-error', { taskId, userId, signersArray, signers }, 'error');
      throw new Error('Can not find or create all signers.');
    }

    // Update task with signer users.
    const signerIds = signers.map((v) => v.userId);
    const signerNames = signersArray.map((v) => (v.middleName ? `${v.lastName} ${v.firstName} ${v.middleName}` : `${v.lastName} ${v.firstName}`));
    const updatedTask = await models.task.setSignerUsers(taskId, signerIds, signerNames);
    updatedTask.setIsMeSignerAndPerformer(userId, userUnitIds.all);

    const taskMeta = { multisignerSchemaPath };
    await this.addTaskMetadata(updatedTask, userId, false, taskMeta);

    return updatedTask;
  }

  /**
   * Check user access as signer.
   * @param {string} taskId Task Id.
   * @param {string} multisignerSchemaPath Multisigner schema path.
   * @param {string} userId User Id.
   * @param {object} userInfo User info.
   */
  async checkUserAccessAsSigner(taskId, multisignerSchemaPath, userId, userInfo) {
    // Get task.
    const task = await models.task.findById(taskId);
    if (!task) {
      throw new NotFoundError(ERROR_TASK_NOT_FOUND);
    }

    // Get document by JSON schema.
    const { document } = task;
    let jsonSchema;
    if (document) {
      // Get document JSON schema.
      const templateId = document.documentTemplateId;
      const template = await models.documentTemplate.findById(templateId);
      if (!template) {
        throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
      }
      jsonSchema = template.jsonSchema;
    }

    // Get formula to calculate signers.
    const multisignerControl = PropByPath.get(jsonSchema && jsonSchema.properties, multisignerSchemaPath);
    if (!multisignerControl || typeof multisignerControl !== 'object') {
      throw new Error('Can not find control to calculate signers in JSON schema.');
    }
    const calcSignersFormula = multisignerControl.calcSigners;
    if (!calcSignersFormula || typeof calcSignersFormula !== 'string' || !calcSignersFormula.startsWith('(')) {
      throw new Error('Can not find formula to calculate signers in JSON schema.');
    }

    let calculatedSigners = this.sandbox.evalWithArgs(calcSignersFormula, [document], { meta: { fn: 'multisigners.calcSigners', taskId } });
    if (!calculatedSigners) {
      throw new Error('Can\'t calculate signers data by formula.');
    }

    const { signerUserNames, signerUsers, performerUserNames } = task;
    if (!signerUserNames || !signerUsers) {
      throw new Error('Can\'t get signers user names to check.');
    }
    const userNameIndex = signerUsers.findIndex((v) => v === userId);
    if (userNameIndex === -1) {
      throw new Error('User is not in signerUsers list.');
    }
    const { declinedSignerIds = [] } = task.meta || {};

    const userEqualByIpn = calculatedSigners.find((v) => v.ipn === userInfo.ipn);
    if (!userEqualByIpn) {
      return false;
    }

    // userEqualByIpn userInfo
    let isEqualByName =
      typeof userEqualByIpn.firstName === 'string' &&
      userEqualByIpn.firstName.toUpperCase().trim() === userInfo.firstName.toUpperCase().trim() &&
      typeof userEqualByIpn.lastName === 'string' &&
      userEqualByIpn.lastName.toUpperCase().trim() === userInfo.lastName.toUpperCase().trim() &&
      ((typeof userEqualByIpn.middleName === 'string' &&
        typeof userInfo.middleName === 'string' &&
        userEqualByIpn.middleName.toUpperCase().trim() === userInfo.middleName.toUpperCase().trim()) ||
        (!userEqualByIpn.middleName && !userInfo.middleName));

    if (isEqualByName) {
      const index = declinedSignerIds.indexOf(userId);
      if (index > -1) {
        declinedSignerIds.splice(index, 1);
        const taskMeta = { declinedSignerIds };
        await this.addTaskMetadata(task, userId, false, taskMeta);
      }
      return true;
    }

    if (!isEqualByName) {
      log.save('check-user-access-as-signers-names-equal-error', { userInfo, calculatedSigners }, 'error');
      if (!declinedSignerIds.includes(userId)) {
        declinedSignerIds.push(userId);
      }
      const taskMeta = { declinedSignerIds };
      this.addTaskMetadata(task, userId, false, taskMeta);

      // Prepare options.
      const userName = `${userInfo.lastName} ${userInfo.firstName}${userInfo.middleName ? ' ' + userInfo.middleName : ''}`;
      const performerName = `${performerUserNames && performerUserNames[0]}`;
      const inSignerListName = `${userEqualByIpn.lastName} ${userEqualByIpn.firstName}${
        userEqualByIpn.middleName ? ' ' + userEqualByIpn.middleName : ''
      }`;

      // Translate message.
      let messageUkr = SIGNER_NAME_ERROR_UKR;
      const options = { userName, performerName, inSignerListName };
      for (const key in options) {
        const replacePattern = new RegExp(`\\{${key}\\}`, 'g');
        messageUkr = messageUkr.replace(replacePattern, options[key]);
      }
      const error = new Error(messageUkr);
      throw error;
    }

    return false;
  }

  /**
   * Prepare due date.
   * @private
   * @param {string} deadline Deadline.
   * @param {{documents: DocumentEntity[], events: EventEntity[]}}
   * @returns {string}
   */
  prepareDueDate(deadline, { documents, events }) {
    let dueDate;

    if (deadline.trim().startsWith('(')) {
      deadline = this.sandbox.evalWithArgs(deadline, [documents, events], { meta: { fn: 'prepareDueDate.deadline' } });
    }

    if (/[0-9]+wd/i.test(deadline)) {
      const workDays = parseInt(deadline);
      dueDate = moment(moment().businessAdd(workDays)).format(DATE_FORMAT);
    } else if (/[0-9]+d/i.test(deadline)) {
      const days = parseInt(deadline);
      dueDate = moment().add(days, 'days').format(DATE_FORMAT);
    } else if (/[0-9]+h/i.test(deadline)) {
      const hours = parseInt(deadline);
      dueDate = moment().add(hours, 'hours').format(DATE_FORMAT);
    } else if (/[0-9]+m/i.test(deadline)) {
      const minutes = parseInt(deadline);
      dueDate = moment().add(minutes, 'minutes').format(DATE_FORMAT);
    } else if (moment(deadline, DATE_FORMAT).isValid()) {
      dueDate = moment(deadline).format(DATE_FORMAT);
    } else if (deadline === null) {
      dueDate = null;
    } else {
      throw new Error('Invalid deadline format.');
    }

    return dueDate;
  }

  /**
   * Get unread tasks quantity for user.
   * @param {string} userId User ID.
   * @param {number[]} userUnitIds User unit IDs.
   * @param {number[]} userHeadUnitIds User head unit IDs.
   * @param {object} options Query options.
   * @returns {Promise<{number}>} Unread tasks quantity.
   */
  async getUnreadTasksCount(userId, userUnitIds, userHeadUnitIds, options) {
    // Get tasks.
    return await models.task.getUnreadTasksCount(userId, userUnitIds, userHeadUnitIds, {
      ...options,
    });
  }

  async mapSort(sort) {
    const sortParams = { ...sort };
    for (const sortKey in sortParams) {
      if (FIELDS_MAPPING[sortKey]) {
        sortParams[FIELDS_MAPPING[sortKey]] = sortParams[sortKey];
        delete sortParams[sortKey];
      }
    }

    return sortParams;
  }

  /**
   * Check if task has finished payment.
   * @private
   * @param {object} task Task entity.
   * @returns {boolean} Has finished payment indicator.
   */
  async hasFinishedPayment(task, paymentControlPath) {
    const { document } = task;
    let documentDataObject = document && document.data;
    const calculatedDataArray = JSONPath(`$..[?(@.${CALCULATED_PAYMENT_INDICATOR})]`, documentDataObject);

    if (paymentControlPath) {
      const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');
      const paymentData = PropByPath.get(documentDataObject, paymentDocumentPath);

      if (
        paymentData &&
        paymentData.calculated &&
        paymentData.calculatedHistory &&
        paymentData.processed &&
        paymentData.processed.some((el) => el.status && el.status.isSuccess)
      ) {
        return true;
      }
      return false;
    }

    const finishedPaymentData = calculatedDataArray.find(
      (v) => v.calculated && v.calculatedHistory && v.processed && v.processed.some((el) => el.status && el.status.isSuccess),
    );

    if (finishedPaymentData) return true;
    return false;
  }

  /**
   * Inform new performer users.
   * @param {TaskEntity} task Task entity.
   * @param {string[]} addedPerformerUsers Added performer users.
   */
  async informNewPerformerUsers(task, addedPerformerUsers) {
    // Check if no need to handle.
    if (addedPerformerUsers.length === 0) {
      return;
    }

    // Get document.
    const { taskTemplateId, workflowId, document } = task;

    // Get notification.
    const taskTemplate = await models.taskTemplate.findById(taskTemplateId);
    const {
      jsonSchema: { performerUserNotification },
    } = taskTemplate;
    if (!performerUserNotification) {
      return;
    }

    // Get all workflow documents.
    const tasks = await models.task.getAllByWorkflowId(workflowId);
    const documents = tasks.map((v) => v.document);

    // Prepare message.
    const { title: titleTemplate, text: textTemplate } = performerUserNotification;
    const title = this.sandbox.evalWithArgs(titleTemplate, [documents, tasks, document, task], {
      meta: { fn: 'informNewPerformerUsers.title', taskId: task.id },
    });
    let text = this.sandbox.evalWithArgs(textTemplate, [documents, tasks, document, task], {
      meta: { fn: 'informNewPerformerUsers.text', taskId: task.id },
    });

    // Replace host name macros.
    const regExp = new RegExp(this.mapping.frontUrl.template, 'g');
    text = text.replace(regExp, this.mapping.frontUrl.replace);

    // Send message.
    log.save('inform-performer-users', { addedPerformerUsers, title, text });
    this.notifierService.sendToUser(addedPerformerUsers, title, text);
  }

  /**
   * @param {TaskEntity.taskTemplateId} taskTemplateId
   * @param {DocumentEntity.id} documentId
   * @param {{path: string, value: *, previousValue: *}} properties
   * @param {string} userId
   * @returns {Promise<{task: (Promise<TaskEntity>|Promise<undefined|*>|*), newPerformerUserIds: string[]}>}
   */
  async checkReassignTrigger(taskTemplateId, documentId, properties, userId) {
    const taskTemplate = await models.taskTemplate.findById(taskTemplateId);
    const setPermissions = taskTemplate.jsonSchema.setPermissions || [];

    // Task do not have reassign triggers.
    if (!setPermissions.some((v) => v.reassignTriggers)) {
      return;
    }

    // Check schema.
    const reassignTriggers = setPermissions
      .filter((v) => v.reassignTriggers)
      .map((v) => v.reassignTriggers)
      .flat();
    const isValidReassignTriggers = reassignTriggers.every((v) => v.source && v.calcPerformerUsers);
    if (!isValidReassignTriggers) {
      throw new InvalidSchemaError('Invalid task.setPermission.reassignTriggers schema.', { cause: setPermissions });
    }

    // Get target triggers.
    const targetTriggers = reassignTriggers.filter((trigger) => properties.map((property) => property.path).includes(trigger.source));
    if (targetTriggers.length > 1) {
      throw new InvalidSchemaError(
        'Invalid task.setPermission.reassignTriggers schema. Document update path list matched more than one reassign trigger. There can be only one reassign trigger at time.',
        { cause: setPermissions },
      );
    }

    // Check target triggers.
    if (!targetTriggers.length) {
      return;
    }

    // Update current set permissions schema.
    taskTemplate.jsonSchema.setPermissions = [
      {
        reassignTrigger: {
          source: targetTriggers[0].source,
          calcPerformerUsers: targetTriggers[0].calcPerformerUsers,
        },
      },
    ];

    const task = await models.task.findByDocumentIdWithWorkflow(documentId);

    // Define task permissions.
    const { performerUsers: newPerformerUserIds } = await this.getTaskPermissions(
      task.workflow,
      taskTemplate,
      userId,
      undefined,
      undefined,
      task.performerUnits,
      task.meta,
      task.activityLog,
    );

    // Do not set performer users if trigger returned an empty user list.
    if (!newPerformerUserIds.length) {
      return;
    }

    // Check optional project params.
    if (global.config?.custom?.optionalProjectParams?.isOnlySinglePerformerUser && newPerformerUserIds.length > 1) {
      throw new InvalidSchemaError('Performer user can be only one.', { cause: { newPerformerUserIds, setPermissions } });
    }

    // Define new performer users names.
    const newPerformerUsersData = await this.auth.getUsersByIds(newPerformerUserIds, false);
    const newPerformerUserNames = newPerformerUsersData.map((v) => v.name);

    // Set performer users.
    await models.task.setPerformerUsers(task.id, newPerformerUserIds, newPerformerUserNames);
    // await models.task.setPerformerUnits();

    // Save custom log.
    this.customLogs.saveCustomLog({
      operationType: 'performers-unassigned',
      performerUsers: task.performerUsers,
      performerUserNames: task.performerUserNames,
      // performerUnits: task.performerUnits,
      workflowId: task.workflowId,
      task: task,
    });

    this.customLogs.saveCustomLog({
      operationType: 'performers-assigned',
      performerUsers: newPerformerUserIds,
      performerUserNames: newPerformerUserNames,
      // performerUnits: newPerformerUnitIds,
      workflowId: task.workflowId,
      task: task,
    });

    // Handle activity.
    await this.handleActivityTypeEvents(task, 'TASK_PERFORMERS_CHANGED');
    if (global.config.activity_log?.isEnabled) {
      const activity = new TaskActivity({
        type: 'TASK_PERFORMERS_CHANGED',
        details: {
          changeType: 'REASSIGN_TRIGGERED_BY_USER',
          userId: userId,
          userUnits: await Helpers.getUserUnits(userId),
          unassignedUsers: await Helpers.appendUnitIdsToUsers(task.performerUsers),
          unassignedUnits: [],
          assignedUsers: await Helpers.appendUnitIdsToUsers(newPerformerUserIds),
          assignedUnits: [],
        },
      });
      const taskWithCurrentActivityLog = await models.task.appendActivityLog(task.id, activity);
      task.activityLog = taskWithCurrentActivityLog.activityLog;
    }

    return { task, newPerformerUserIds };
  }

  /**
   * @param {TaskEntity} task
   * @param {TaskActivity.type} type
   * @return {Promise<void>}
   */
  async handleActivityTypeEvents(task, type) {
    try {
      const taskTemplate = await models.taskTemplate.findById(task.taskTemplateId);
      const { onCreate, onPerformersChange, onCommit } = taskTemplate.jsonSchema;

      if (type === 'TASK_CREATED' && onCreate) {
        if (onCreate.notifyNewPerformers) {
          await this.notifyNewPerformers(onCreate.notifyNewPerformers, task);
        }
        /*if (onCreate.<someMethod>) {}*/
      }

      if (type === 'TASK_PERFORMERS_CHANGED' && onPerformersChange) {
        if (onPerformersChange.notifyNewPerformers) {
          await this.notifyNewPerformers(onPerformersChange.notifyNewPerformers, task);
        }
      }

      if (type === 'TASK_COMMITTED' && onCommit) {
        if (onCommit.notifyNewPerformers) {
          await this.notifyNewPerformers(onCommit.notifyNewPerformers, task);
        }
      }
    } catch (error) {
      await models.workflowError.create({
        error: `TaskBusiness.handleActivityEvents ${error.message}`,
        details: {
          type: type,
          cause: error.cause,
        },
        traceMeta: {
          workflowId: task.workflowId,
        },
      });
      throw error;
    }
  }

  /**
   * @private
   * @param {string<function({documents: Array<DocumentEntity>, currentTaskPerformersByUnits: {userId: UserData.userId, units: UserData.userUnits}, optionalProjectParams: Object, meta: TaskEntity.meta}): {title: string, text: string, userIds: Array<UserData.userId>}>} notifyNewPerformersFunction
   * @param {TaskEntity} task
   * @return {Promise<void>}
   */
  async notifyNewPerformers(notifyNewPerformersFunction, task) {
    // Get all process documents.
    const documents = await models.document.getAllByWorkflowId({ workflowId: task.workflowId });

    // Get all uniq users by task units.
    const allUnits = await models.unit.getAll();
    const units = allUnits.filter((unit) => task.performerUnits.includes(unit.id));
    const userIdsFromTaskUnits = new Set(
      units.reduce((previousUnit, currentUnit) => previousUnit.concat([...currentUnit.heads, ...currentUnit.members]), []),
    );

    // Append units to users.
    const currentTaskPerformersByUnits = [];
    for (const userId of userIdsFromTaskUnits) {
      currentTaskPerformersByUnits.push({
        userId: userId,
        units: {
          head: allUnits.filter((v) => v.heads.includes(userId)).map((v) => v.id),
          member: allUnits.filter((v) => v.members.includes(userId)).map((v) => v.id),
        },
      });
    }

    // Calculate.
    let evalResult;
    try {
      evalResult = this.sandbox.evalWithArgs(
        notifyNewPerformersFunction,
        [
          {
            documents: documents,
            currentTaskPerformersByUnits,
            optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
            currentTaskPerformerUnitIds: task.performerUnits,
            meta: task.meta,
            taskActivityLog: _.cloneDeep(task.activityLog),
          },
        ],
        { meta: { fn: 'notifyNewPerformers', taskId: task.id } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError('task.notifyNewPerformers schema function throw error.', { cause: { error: error.toString() } });
    }

    // Check if no need to handle.
    if (evalResult?.userIds?.length === 0) {
      return;
    }

    if (!evalResult.title || !evalResult.text) {
      throw new InvalidSchemaError('task.notifyNewPerformers schema function should return title, text.');
    }

    // Replace host name macros.
    const regExp = new RegExp(this.mapping.frontUrl.template, 'g');
    evalResult.text = evalResult.text.replace(regExp, this.mapping.frontUrl.replace);

    // Send message.
    this.notifierService.sendToUser(evalResult.userIds, evalResult.title, evalResult.text);
    log.save('notify-new-performers-send-to-user', { evalResult });
  }

  /**
   * Get signatures info.
   * @param {string[]} signatures Signatures (base64).
   * @returns {Promise<SignatureInfo[]>} Signatures info promise.
   */
  async getSignaturesInfo(signatures) {
    // Handle signatures.
    let signaturesInfo = [];
    for (const signature of signatures) {
      // Check signature.
      if (!signature) throw new InvalidParamsError('Signature is empty.');

      // Get signature info.
      let signatureInfo;
      try {
        signatureInfo = await this.eds.getSignatureInfo(signature);
        if (!signatureInfo) throw new InvalidParamsError('Signature is invalid.');
        signaturesInfo.push(new SignatureInfoEntity({ ...signatureInfo, signature }));
      } catch (error) {
        signaturesInfo.push({ error: error.message, signature });
      }
    }
    return signaturesInfo;
  }

  /*
   * Validate workflow by drafts count limiter.
   * @param {string} userId User ID.
   * @param {number} taskTemplateId Task template ID.
   * @param {object} workflowTemplate Workflow template.
   * @throws {Error} Only one draft allowed. Details: {message: string, task: TaskEntity}
   */
  async validateWorkflowByDraftsCountLimiter(userId, taskTemplateId, workflowTemplate) {
    const { isOnlyOneDraftAllowed, oneDraftAllowedMessage } = workflowTemplate;
    if (isOnlyOneDraftAllowed) {
      const lastUserDraft = await models.task.getLastUserDraft(userId, taskTemplateId);
      if (lastUserDraft?.meta?.willDeleteCurrentDraft === true) {
        await this.delete(lastUserDraft.id, userId, { force: false });
        return;
      }
      if (lastUserDraft) {
        const error = new Error('Only one draft allowed.');
        error.details = {
          message: oneDraftAllowedMessage,
          task: lastUserDraft,
        };
        throw error;
      }
    }
  }

  /**
   * Get retry info.
   * @param {object} message Message object.
   * @param {object} jsonSchema JSON schema object.
   * @returns {{retryMessage: {retryIterator: number, workflowId, taskTemplateId}, postponedTime}} Retry info.
   */
  getRetryInfo(message, jsonSchema) {
    // Define params.
    const { retryIterator = 0 } = message;
    const { retryIfError } = jsonSchema;
    const needToRetryIfError = Array.isArray(retryIfError) && retryIfError.length > 0;
    const postponedTime = needToRetryIfError && retryIfError[retryIterator];

    // Check if no need to retry.
    if (!postponedTime) {
      return;
    }

    // Create retry message.
    const nextRetryIterator = retryIterator + 1;
    const retryMessage = {
      ...message,
      retryIterator: nextRetryIterator,
    };

    // Create and return retry info.
    return {
      retryMessage,
      postponedTime,
    };
  }

  /**
   * @param {{isEnabled: function, context: Array<{name: string, provider: string, options: function}>, checks: Array<function>}} extendedAccessCheckSchema
   * @param {DocumentEntity} document Document.
   * @param {string} userId User ID.
   * @return {Promise<boolean>}
   */
  async extendedAccessCheck(extendedAccessCheckSchema, document, userId) {
    if (
      (typeOf(extendedAccessCheckSchema?.isEnabled) !== 'string' && typeOf(extendedAccessCheckSchema?.isEnabled) !== 'boolean') ||
      typeOf(extendedAccessCheckSchema?.checks) !== 'array'
    ) {
      throw new InvalidSchemaError('Invalid extendedAccessCheck schema. isEnabled/checks required.');
    }

    let isEnabled = false;
    if (typeOf(extendedAccessCheckSchema.isEnabled) === 'boolean') {
      isEnabled = extendedAccessCheckSchema.isEnabled;
    } else if (typeOf(extendedAccessCheckSchema.isEnabled) === 'string') {
      try {
        isEnabled = this.sandbox.evalWithArgs(extendedAccessCheckSchema.isEnabled, [document.data], {
          meta: { fn: 'extendedAccessCheck.isEnabled', documentId: document.id },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`extendedAccessCheck.isEnabled function throw error. $${error.toString()}`);
      }
    }

    if (!isEnabled) {
      // Allow access if extended access check schema disabled.
      return true;
    }

    const context = await extendedAccessCheckSchema.context.reduce(async (accPromise, { name, provider, options }, index) => {
      const acc = await accPromise;
      const [providerType, service, method] = provider.split('.');

      let providerData;
      switch (providerType) {
        case 'external-reader': {
          let nonUserFilter;
          try {
            nonUserFilter = this.sandbox.evalWithArgs(options, [document.data], {
              meta: { fn: `extendedAccessCheck.context[${index}].options`, documentId: document.id },
            });
          } catch (error) {
            throw new EvaluateSchemaFunctionError(`extendedAccessCheck.context[${index}].options function throw error. $${error.toString()}`);
          }
          providerData = (await this.externalReader.getDataByUser(service, method, undefined, undefined, undefined, nonUserFilter)).data;
          break;
        }
        case 'user': {
          try {
            providerData = (await this.auth.getUsersByIds([userId], true))[0];
          } catch {
            throw new InternalServerError(`extendedAccessCheck.context[${index}]. Cannot get user data by userId.`);
          }
          break;
        }
      }

      return { ...acc, [name]: providerData };
    }, Promise.resolve({}));

    for (const [index, check] of extendedAccessCheckSchema.checks.entries()) {
      let checkResult;
      try {
        checkResult = this.sandbox.evalWithArgs(check, [document.data, context], {
          meta: { fn: `extendedAccessCheck.checks[${index}]`, documentId: document.id },
        });
      } catch (error) {
        throw new EvaluateSchemaFunctionError(`extendedAccessCheck.checks[${index}] function throw error. $${error.toString()}`);
      }
      if (typeOf(checkResult) !== 'boolean') {
        throw new InvalidSchemaError(
          `Invalid extendedAccessCheck schema. extendedAccessCheck.checks[${index}] function should return Boolean value.`,
        );
      }
      if (!checkResult) {
        // If check function has returned `false` - user has no access to the task.
        return false;
      }
    }

    return true;
  }

  /**
   * Check can create system task from AMQP message.
   * @param {object} messageObject AMQP message object.
   */
  async checkCreateByOtherSystemFromMessage(message) {
    const { isAllowedCreateByOtherSystems, tasksTemplateIds } = config?.system_task || {};
    const { taskTemplateId } = message;
    if (!isAllowedCreateByOtherSystems || !tasksTemplateIds.map((v) => `${v}`).includes(`${taskTemplateId}`)) {
      log.save('create-by-other-system-from-message-check-failed', {
        tasksTemplateIds,
        taskTemplateId,
        isAllowedCreateByOtherSystems,
      });
      return false;
    }
    return true;
  }

  /**
   * Calculate draft expiredAt param and update task if need.
   * @param {TaskEntity}> Task.
   * @param {object} schema Task schema.
   * @param {boolean} isAfterUpdate Flag recalculating while update document.
   * @return {Promise<TaskEntity>}
   */
  async calculateAndUpdateDraftExpiredAt(task, schema, isAfterUpdate = false) {
    if (!task.isEntry || task.finished) return task;
    const { deleteDraftAt, deleteDraftAfterCreateAt, deleteDraftAfterUpdateAt } = schema;
    if (!deleteDraftAt && !deleteDraftAfterCreateAt && !deleteDraftAfterUpdateAt) return;
    if (isAfterUpdate && !deleteDraftAfterUpdateAt) return task;
    const ERROR_PREFIX = 'Calculate drafExpiredAt:';
    if ([deleteDraftAt, deleteDraftAfterCreateAt, deleteDraftAfterUpdateAt].filter(Boolean).length > 1) {
      throw new Error(`${ERROR_PREFIX} only one param of deleteDraftAt, deleteDraftAfterCreateAt and deleteDraftAfterUpdateAt must be defined.`);
    }
    let draftExpiredAt;
    if (deleteDraftAt) {
      const deleteDraftAtFunction = this.sandbox.eval(deleteDraftAt);
      if (typeOf(deleteDraftAtFunction) !== 'function') {
        throw new Error(`${ERROR_PREFIX} param deleteDraftAt must be a string of valid function.`);
      }
      try {
        draftExpiredAt = deleteDraftAtFunction(task);
      } catch (error) {
        throw new Error(`${ERROR_PREFIX} evaluation error. Details: ${error.message}.`);
      }
    }
    if (deleteDraftAfterCreateAt) {
      try {
        draftExpiredAt = this.prepareDraftExpiredAt(deleteDraftAfterCreateAt, task.createdAt);
      } catch (error) {
        throw new Error(`${ERROR_PREFIX} defined not valid deleteDraftAfterCreateAt param. Details: ${error.message}.`);
      }
    }
    if (deleteDraftAfterUpdateAt) {
      try {
        draftExpiredAt = this.prepareDraftExpiredAt(deleteDraftAfterUpdateAt, task.document.updatedAt);
      } catch (error) {
        throw new Error(`${ERROR_PREFIX} defined not valid deleteDraftAfterUpdateAt param. Details: ${error.message}.`);
      }
    }
    let draftExpiredAtDate = typeOf(draftExpiredAt) === 'date' ? draftExpiredAt : new Date(draftExpiredAt);
    const updatedTask = await models.task.setDrafExpiredAt(task.id, draftExpiredAtDate);
    task.draftExpiredAt = updatedTask.draftExpiredAt;
    return task;
  }

  /**
   * Calculate draft expiredAt param and update task if need.
   * @param {string}> userId.
   * @return {Promise<Object>} result object. {success: true, count: <integer>}
   */
  async deleteExpiredDraftsByUserId(userId) {
    const expiredDrafts = (
      await models.task.getAllByUserId(userId, [], [], {
        filters: {
          is_entry: true,
          finished: false,
          draft_expired_at_to: new Date(),
        },
        sort: {
          created_at: 'ASC',
        },
        currentPage: 1,
        perPage: 1000,
      })
    ).data;
    if (expiredDrafts.length === 0) return;
    /*
      Must delete all related entities in order bellow.
      1. document_attachments
      2. document_signature_rejections
      3. document_signatures
      4. additional_data_signatures
      5. tasks.
      6. documents.
      7. workflow_errors
      8. workflows
    */
    for (let draft of expiredDrafts) {
      const { id: taskId, workflowId, documentId } = draft;
      try {
        await models.documentAttachment.deleteByDocumentId(documentId);
        await models.documentSignatureRejection.deleteByDocumentId(documentId);
        await models.documentSignature.deleteByDocumentId(documentId);
        await models.additionalDataSignature.deleteByDocumentId(documentId);
        await models.task.deleteById(taskId);
        await models.document.deleteById(documentId);
        await models.workflowError.deleteByWorkflowId(workflowId);
        await models.workflow.deleteById(workflowId);

        log.save('drafts-auto-delete|one-task', { userId, taskId, workflowId, documentId });
      } catch (error) {
        log.save(
          'delete-expired-drafts-by-user-id|error|cannot-delete-related-entities',
          { taskId, workflowId, documentId, error: error?.message || error },
          'error',
        );

        throw new Error(`Delete expired user drafts: cannot delete related entities. TaskId: ${taskId}. Error: ${error?.message || error}.`);
      }
    }
    const draftIds = expiredDrafts.map(({ id }) => id);
    log.save('drafts-auto-delete|all-tasks', { userId, draftIds });

    return { success: true, count: draftIds.length };
  }

  /**
   * Check draft expired.
   * @note Use models.task.checkDraftExpirationByDocumentId if task is not already fetched.
   * @param {TaskEntity} task.
   * @return {<Boolean>} is draft already expired.
   */
  checkDraftExpired(task) {
    if (!task.draftExpiredAt) return false;
    return task.draftExpiredAt <= Date.now();
  }

  /**
   * Prepare draft expiredAt.
   * @private
   * @param {string} timeToAdd Time to add: 3wd (working days), 4d (days), 5h (hours), 6m (minutes)
   * @param {string} date Date (createdAt / updatedAt). This date will be increase by timeToAdd.
   * @returns {string} Date string.
   */
  prepareDraftExpiredAt(timeToAdd, date = new Date()) {
    let draftExpiredAt;

    if (/[0-9]+wd/i.test(timeToAdd)) {
      const workDays = parseInt(timeToAdd);
      draftExpiredAt = moment(moment(date).businessAdd(workDays)).format(DATE_FORMAT);
    } else if (/[0-9]+d/i.test(timeToAdd)) {
      const days = parseInt(timeToAdd);
      draftExpiredAt = moment(date).add(days, 'days').format(DATE_FORMAT);
    } else if (/[0-9]+h/i.test(timeToAdd)) {
      const hours = parseInt(timeToAdd);
      draftExpiredAt = moment(date).add(hours, 'hours').format(DATE_FORMAT);
    } else if (/[0-9]+m/i.test(timeToAdd)) {
      const minutes = parseInt(timeToAdd);
      draftExpiredAt = moment(date).add(minutes, 'minutes').format(DATE_FORMAT);
    } else if (timeToAdd === null) {
      draftExpiredAt = null;
    } else {
      throw new Error('Invalid timeToAdd format.');
    }
    return draftExpiredAt;
  }
}

module.exports = TaskBusiness;
