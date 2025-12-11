const jsoncParser = require('jsonc-parser');
const Queue = require('queue-promise');

const Filestorage = require('../lib/filestorage');
const Sign = require('../lib/sign');
const RecordMap = require('../lib/record_map');
const SystemNotifier = require('../lib/system_notifier');
const { getTraceId } = require('../lib/async_local_storage');
const Sandbox = require('../lib/sandbox');
const EventTypeModel = require('../models/event_type');
const WorkflowErrorModel = require('../models/workflow_error');
const EventModel = require('../models/event');
const EventTemplateModel = require('../models/event_template');
const TaskModel = require('../models/task');
const DocumentModel = require('../models/document');
const DocumentTemplateModel = require('../models/document_template');
const DocumentAttachmentModel = require('../models/document_attachment');
const WorkflowModel = require('../models/workflow');
const WorkflowDebugModel = require('../models/workflow_debug');
const WorkflowTemplateModel = require('../models/workflow_template');
const UnitModel = require('../models/unit');
const AccessHistoryModel = require('../models/access_history');
const UserInboxModel = require('../models/user_inbox');
const WorkflowHistoryModel = require('../models/workflow_history');
const EventService = require('../services/event');
const CustomLogs = require('../services/custom_logs');
const RunningEvents = require('../lib/running_events');
const { EvaluateSchemaFunctionError } = require('../lib/errors');
const { SYSTEM_USER } = require('../constants/common');
const { CRUD_TYPE } = require('../constants/http');

// Constants.
const ERROR_WRONG_EVENT_TYPE = 'Wrong event type.';
const NOTIFICATION_FAILED_RESPONSE_MESSAGE_PARTS = ['Не удалось'];

/**
 * Event business.
 */
class EventBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!EventBusiness.singleton) {
      this.config = config;
      this.filestorage = new Filestorage();
      this.sign = new Sign();
      this.systemNotifier = new SystemNotifier();
      this.sandbox = Sandbox.getInstance();
      this.workflowErrorModel = new WorkflowErrorModel();
      this.eventTypeModel = new EventTypeModel();
      this.eventModel = new EventModel();
      this.eventTemplateModel = new EventTemplateModel();
      this.taskModel = new TaskModel();
      this.documentModel = new DocumentModel();
      this.documentTemplateModel = new DocumentTemplateModel();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.workflowModel = new WorkflowModel();
      this.workflowTemplateModel = new WorkflowTemplateModel();
      this.workflowDebugModel = new WorkflowDebugModel();
      this.unitModel = new UnitModel();
      this.accessHistoryModel = new AccessHistoryModel();
      this.userInboxModel = new UserInboxModel();
      this.workflowHistoryModel = new WorkflowHistoryModel();
      this.eventService = new EventService();
      this.customLogs = new CustomLogs();
      this.runningEvents = new RunningEvents(this.eventModel);
      EventBusiness.singleton = this;
    }

    // Return singleton.
    return EventBusiness.singleton;
  }

  /**
   * Calculate all event data from schema.
   * @param {string} workflowId Workflow ID.
   * @param {object} jsonSchemaObject JSON schema object.
   * @param {array} documents Workflow documents.
   * @param {array} events Workflow events.
   * @param {string} eventTemplateId Event template ID.
   * @returns {Promise<object>} Calculated event data object.
   */
  async calculateEventData(workflowId, jsonSchemaObject, documents, events, eventTemplateId) {
    const calculated = {};

    try {
      calculated.emails = this.sandbox.evalWithArgs(jsonSchemaObject.emails || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsByUserId = this.sandbox.evalWithArgs(jsonSchemaObject.emailsByUserId || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsSubscribeToDigest = this.sandbox.evalWithArgs(jsonSchemaObject.emailsSubscribeToDigest || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsByUnitId = this.sandbox.evalWithArgs(jsonSchemaObject.emailsByUnitId || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsHeadByUnitId = this.sandbox.evalWithArgs(jsonSchemaObject.emailsHeadByUnitId || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsMemberByUnitId = this.sandbox.evalWithArgs(jsonSchemaObject.emailsMemberByUnitId || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailsByIpn = this.sandbox.evalWithArgs(jsonSchemaObject.emailsByIpn || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.emailTemplateId = this.sandbox.evalWithArgs(jsonSchemaObject.emailTemplateId || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.phones = this.sandbox.evalWithArgs(jsonSchemaObject.phones || '() => { return []; }', [documents, events], { eventTemplateId });
      calculated.subject = this.sandbox.evalWithArgs(jsonSchemaObject.subject || '() => { return \'\'; }', [documents, events], { eventTemplateId });
      calculated.fullText = await this.sandbox.evalWithArgs(
        (jsonSchemaObject.fullText && this.transformFunctionToAsync(jsonSchemaObject.fullText)) || '() => { return \'\'; }',
        [documents, events, workflowId],
        { isAsync: true, eventTemplateId },
      );
      calculated.shortText = this.sandbox.evalWithArgs(jsonSchemaObject.shortText || '() => { return \'\'; }', [documents, events], { eventTemplateId });
      calculated.saveToBlockchain = this.sandbox.evalWithArgs(jsonSchemaObject.saveToBlockchain || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.saveToRegisters = await new RecordMap(jsonSchemaObject.saveToRegisters, documents, events, undefined, eventTemplateId).getRecord();
      if (jsonSchemaObject.saveToRegistersList) {
        calculated.saveToRegistersList = [];
        const list = this.sandbox.evalWithArgs(jsonSchemaObject.saveToRegistersList.arrayToDefineLength, [documents, events], { eventTemplateId });
        for (let i = 0; i < list.length; i++) {
          const record = await new RecordMap(jsonSchemaObject.saveToRegistersList, documents, events, i, eventTemplateId).getRecord();
          calculated.saveToRegistersList.push(record);
        }
      }
      calculated.saveRegisterRecordsToCsv = this.sandbox.evalWithArgs(jsonSchemaObject.saveRegisterRecordsToCsv || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.updateRegisters = await new RecordMap(jsonSchemaObject.updateRegisters, documents, events, undefined, eventTemplateId).getRecord();
      if (jsonSchemaObject.updateRegistersList) {
        calculated.updateRegistersList = [];
        const promises = [];
        const list = this.sandbox.evalWithArgs(jsonSchemaObject.updateRegistersList.arrayToDefineLength, [documents, events], { eventTemplateId });
        for (let i = 0; i < list.length; i++) {
          promises.push(new RecordMap(jsonSchemaObject.updateRegistersList, documents, events, i, eventTemplateId).getRecord());
        }
        calculated.updateRegistersList = await Promise.all(promises);
      }
      calculated.deleteRegisters = this.sandbox.evalWithArgs(jsonSchemaObject.deleteRegisters || '() => { return \'\'; }', [documents, events], { eventTemplateId });
      if (jsonSchemaObject.deleteRegistersList) {
        calculated.deleteRegistersList = {
          recordIds: this.sandbox.evalWithArgs(jsonSchemaObject.deleteRegistersList.recordIds, [documents, events], { eventTemplateId }),
          registerId: jsonSchemaObject.deleteRegistersList.registerId,
          keyId: jsonSchemaObject.deleteRegistersList.keyId,
          returnDeletedRecords: jsonSchemaObject.deleteRegistersList.returnDeletedRecords,
        };
      }
      calculated.getRegisters = this.sandbox.evalWithArgs(jsonSchemaObject.getRegisters || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.countRegisters = this.sandbox.evalWithArgs(jsonSchemaObject.countRegisters || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.getRegistersByPost = this.sandbox.evalWithArgs(jsonSchemaObject.getRegistersByPost || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.sendToExternalService = jsonSchemaObject.sendToExternalService;
      calculated.taskTemplateIdsFilter = jsonSchemaObject.taskTemplateIdsFilter;
      calculated.eventTemplateIdsFilter = jsonSchemaObject.eventTemplateIdsFilter;
      calculated.eventUnitType = jsonSchemaObject.eventUnitType;
      calculated.unitData = {
        id: this.sandbox.evalWithArgs(jsonSchemaObject.id || '() => { return; }', [documents, events], { eventTemplateId }),
        parentId: this.sandbox.evalWithArgs(jsonSchemaObject.parentId || '() => { return; }', [documents, events], { eventTemplateId }),
        basedOn: this.sandbox.evalWithArgs(jsonSchemaObject.basedOn || '() => { return []; }', [documents, events], { eventTemplateId }),
        name: this.sandbox.evalWithArgs(jsonSchemaObject.name || '() => { return \'\'; }', [documents, events], { eventTemplateId }),
        description: this.sandbox.evalWithArgs(jsonSchemaObject.description || '() => { return \'\'; }', [documents, events], { eventTemplateId }),
        menuConfig: jsonSchemaObject.menuConfig,
        allowTokens: this.sandbox.evalWithArgs(jsonSchemaObject.allowTokens || '() => { return []; }', [documents, events], { eventTemplateId }),
        allowTokenEqualsId: this.sandbox.evalWithArgs(jsonSchemaObject.allowTokenEqualsId || '() => { return false; }', [documents, events], { eventTemplateId }),
        isAllowTokensMustBeAppended: jsonSchemaObject.isAllowTokensMustBeAppended || false,
        data: this.sandbox.evalWithArgs(jsonSchemaObject.data || '() => { return {}; }', [documents, events], { eventTemplateId }),
        heads:
          calculated.eventUnitType === 'update' && !jsonSchemaObject.heads ? null : this.sandbox.evalWithArgs(jsonSchemaObject.heads || '() => { return []; }', [documents, events], { eventTemplateId }),
        members:
          calculated.eventUnitType === 'update' && !jsonSchemaObject.members
            ? null
            : this.sandbox.evalWithArgs(jsonSchemaObject.members || '() => { return []; }', [documents, events], { eventTemplateId }),
        headsIpn:
          calculated.eventUnitType === 'update' && !jsonSchemaObject.headsIpn
            ? null
            : this.sandbox.evalWithArgs(jsonSchemaObject.headsIpn || '() => { return []; }', [documents, events], { eventTemplateId }),
        membersIpn:
          calculated.eventUnitType === 'update' && !jsonSchemaObject.membersIpn
            ? null
            : this.sandbox.evalWithArgs(jsonSchemaObject.membersIpn || '() => { return []; }', [documents, events], { eventTemplateId }),
      };
      calculated.eventUserType = jsonSchemaObject.eventUserType;
      if (typeof jsonSchemaObject.searchData === 'object') {
        calculated.searchData = {
          userIds: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.userIds || '() => { return []; }', [documents, events], { eventTemplateId }),
          unitIds: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.unitIds || '() => { return []; }', [documents, events], { eventTemplateId }),
          ids: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.ids || '() => { return []; }', [documents, events], { eventTemplateId }),
          codes: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.ipnArray || jsonSchemaObject.searchData.codes || '() => { return []; }', [documents, events], { eventTemplateId }),
          code: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.ipn || jsonSchemaObject.searchData.code || '() => { return \'\'; }', [documents, events], { eventTemplateId }),
          edrpou: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.edrpou || '() => []', [documents, events], { eventTemplateId }),
          search: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.search || '() => { return \'\'; }', [documents, events], { eventTemplateId }),
          basedOn: this.sandbox.evalWithArgs(jsonSchemaObject.searchData.basedOn || '() => { return []; }', [documents, events], { eventTemplateId }),
        };
      } else if (jsonSchemaObject.searchData) {
        throw new EvaluateSchemaFunctionError('searchData must be an object.');
      }
      calculated.unitId = this.sandbox.evalWithArgs(jsonSchemaObject.unitId || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.unitIdList = this.sandbox.evalWithArgs(jsonSchemaObject.unitIdList || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.userId = this.sandbox.evalWithArgs(jsonSchemaObject.userId || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.userIdList = this.sandbox.evalWithArgs(jsonSchemaObject.userIdList || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.ipn = this.sandbox.evalWithArgs(jsonSchemaObject.ipn || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.ipnList = this.sandbox.evalWithArgs(jsonSchemaObject.ipnList || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.userName = this.sandbox.evalWithArgs(jsonSchemaObject.userName || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.initUserName = this.sandbox.evalWithArgs(jsonSchemaObject.initUserName || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.initUserId = this.sandbox.evalWithArgs(jsonSchemaObject.initUserId || '() => { return; }', [documents, events], { eventTemplateId });

      if (jsonSchemaObject.userData) {
        const addressStructRegion = this.sandbox.evalWithArgs(
          jsonSchemaObject.userData.addressStructRegion || '() => { return { id: \'\', registerRecordId: \'\', name: \'\'}; }',
          [documents, events],
          { eventTemplateId }
        );
        const addressStructDistrict = this.sandbox.evalWithArgs(
          jsonSchemaObject.userData.addressStructDistrict || '() => { return { id: \'\', registerRecordId: \'\', name: \'\'}; }',
          [documents, events],
          { eventTemplateId }
        );
        const addressStructCity = this.sandbox.evalWithArgs(
          jsonSchemaObject.userData.addressStructCity || '() => { return { id: \'\', registerRecordId: \'\', name: \'\', type: \'\'}; }',
          [documents, events],
          { eventTemplateId }
        );
        const addressStructStreet = this.sandbox.evalWithArgs(
          jsonSchemaObject.userData.addressStructStreet || '() => { return { id: \'\', registerRecordId: \'\', name: \'\', type: \'\' }; }',
          [documents, events],
          { eventTemplateId }
        );
        const addressStructBuilding = this.sandbox.evalWithArgs(jsonSchemaObject.userData.addressStructBuilding || '() => { return \'\'; }', [documents, events], { eventTemplateId });
        const addressStructKorp = this.sandbox.evalWithArgs(jsonSchemaObject.userData.addressStructKorp || '() => { return \'\'; }', [documents, events], { eventTemplateId });
        const addressStructApt = this.sandbox.evalWithArgs(jsonSchemaObject.userData.addressStructApt || '() => { return \'\'; }', [documents, events], { eventTemplateId });
        const addressStructIndex = this.sandbox.evalWithArgs(jsonSchemaObject.userData.addressStructIndex || '() => { return \'\'; }', [documents, events], { eventTemplateId });
        calculated.userData = {
          gender: this.sandbox.evalWithArgs(jsonSchemaObject.userData.gender || '() => { return; }', [documents, events], { eventTemplateId }),
          birthday: this.sandbox.evalWithArgs(jsonSchemaObject.userData.birthday || '() => { return; }', [documents, events], { eventTemplateId }),
          isIndividualEntrepreneur: this.sandbox.evalWithArgs(jsonSchemaObject.userData.isIndividualEntrepreneur || '() => { return; }', [documents, events], { eventTemplateId }),
          legalEntityDateRegistration: this.sandbox.evalWithArgs(jsonSchemaObject.userData.legalEntityDateRegistration || '() => { return; }', [documents, events], { eventTemplateId }),
          address: this.sandbox.evalWithArgs(jsonSchemaObject.userData.address || '() => { return; }', [documents, events], { eventTemplateId }),
          passportSeries: this.sandbox.evalWithArgs(jsonSchemaObject.userData.passportSeries || '() => { return; }', [documents, events], { eventTemplateId }),
          passportNumber: this.sandbox.evalWithArgs(jsonSchemaObject.userData.passportNumber || '() => { return; }', [documents, events], { eventTemplateId }),
          passportIssueDate: this.sandbox.evalWithArgs(jsonSchemaObject.userData.passportIssueDate || '() => { return; }', [documents, events], { eventTemplateId }),
          passportIssuedBy: this.sandbox.evalWithArgs(jsonSchemaObject.userData.passportIssuedBy || '() => { return; }', [documents, events], { eventTemplateId }),
          foreignersDocumentSeries: this.sandbox.evalWithArgs(jsonSchemaObject.userData.foreignersDocumentSeries || '() => { return; }', [documents, events], { eventTemplateId }),
          foreignersDocumentNumber: this.sandbox.evalWithArgs(jsonSchemaObject.userData.foreignersDocumentNumber || '() => { return; }', [documents, events], { eventTemplateId }),
          foreignersDocumentIssueDate: this.sandbox.evalWithArgs(jsonSchemaObject.userData.foreignersDocumentIssueDate || '() => { return; }', [documents, events], { eventTemplateId }),
          foreignersDocumentExpireDate: this.sandbox.evalWithArgs(jsonSchemaObject.userData.foreignersDocumentExpireDate || '() => { return; }', [documents, events], { eventTemplateId }),
          foreignersDocumentIssuedBy: this.sandbox.evalWithArgs(jsonSchemaObject.userData.foreignersDocumentIssuedBy || '() => { return; }', [documents, events], { eventTemplateId }),
          idCardNumber: this.sandbox.evalWithArgs(jsonSchemaObject.userData.idCardNumber || '() => { return; }', [documents, events], { eventTemplateId }),
          idCardIssueDate: this.sandbox.evalWithArgs(jsonSchemaObject.userData.idCardIssueDate || '() => { return; }', [documents, events], { eventTemplateId }),
          idCardIssuedBy: this.sandbox.evalWithArgs(jsonSchemaObject.userData.idCardIssuedBy || '() => { return; }', [documents, events], { eventTemplateId }),
          idCardExpiryDate: this.sandbox.evalWithArgs(jsonSchemaObject.userData.idCardExpiryDate || '() => { return; }', [documents, events], { eventTemplateId }),
          onboardingTaskId: this.sandbox.evalWithArgs(jsonSchemaObject.userData.onboardingTaskId || '() => { return; }', [documents, events], { eventTemplateId }),
          needOnboarding: this.sandbox.evalWithArgs(jsonSchemaObject.userData.needOnboarding || '() => { return; }', [documents, events], { eventTemplateId }),
          isPrivateHouse: this.sandbox.evalWithArgs(jsonSchemaObject.userData.isPrivateHouse || '() => { return; }', [documents, events], { eventTemplateId }),
          addressStruct: {
            region: addressStructRegion,
            district: addressStructDistrict,
            city: addressStructCity,
            street: addressStructStreet,
            building: addressStructBuilding,
            korp: addressStructKorp,
            apt: addressStructApt,
            index: addressStructIndex,
          },
        };
      }
      calculated.getDocument = jsonSchemaObject.getDocument;
      calculated.saveDocument = jsonSchemaObject.saveDocument;
      calculated.accessJsonSchema = jsonSchemaObject.accessJsonSchema;
      if (jsonSchemaObject.serviceRepositoryData) {
        calculated.serviceRepositoryData = {
          userIpn: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.userIpn || '() => { return; }', [documents], { eventTemplateId }),
          requestId: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.requestId || '() => { return; }', [documents], { eventTemplateId }),
          serviceName: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.serviceName || '() => { return; }', [documents], { eventTemplateId }),
          repositoryServiceId: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.serviceId || '() => { return; }', [documents, events], { eventTemplateId }),
          statusId: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.status || '() => { return; }', [documents, events], { eventTemplateId }),
          statusComment: this.sandbox.evalWithArgs(jsonSchemaObject.serviceRepositoryData.statusComment || '() => { return; }', [documents, events], { eventTemplateId }),
        };
      }
      calculated.sendToCabinetOnly = this.sandbox.evalWithArgs(jsonSchemaObject.sendToCabinetOnly || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.messageCryptTypeId = this.sandbox.evalWithArgs(jsonSchemaObject.messageCryptTypeId || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.importantMessage = this.sandbox.evalWithArgs(jsonSchemaObject.importantMessage || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.hideImportantMessages = this.sandbox.evalWithArgs(jsonSchemaObject.hideImportantMessages || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.sender = this.sandbox.evalWithArgs(jsonSchemaObject.sender || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.createWorkflows = this.sandbox.evalWithArgs(jsonSchemaObject.createWorkflows || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.createWorkflowsExternal = this.sandbox.evalWithArgs(jsonSchemaObject.createWorkflowsExternal || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.sendStatusExternal = this.sandbox.evalWithArgs(jsonSchemaObject.sendStatusExternal || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.sendStatus = this.sandbox.evalWithArgs(jsonSchemaObject.sendStatus || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.setNewTasksPerformers = this.sandbox.evalWithArgs(jsonSchemaObject.setNewTasksPerformers || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.eventMeta = jsonSchemaObject.eventMeta;
      calculated.metaObject = this.sandbox.evalWithArgs(jsonSchemaObject.metaFunction || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.taskId = this.sandbox.evalWithArgs(jsonSchemaObject.taskId || '() => { return; }', [documents, events], { eventTemplateId });
      calculated.delay = /^\(/.test(jsonSchemaObject.delay)
        ? this.sandbox.evalWithArgs(jsonSchemaObject.delay, [documents, events], { eventTemplateId })
        : jsonSchemaObject.delay;

      return calculated;
    } catch (error) {
      log.save('eval-error', { error: error && error.toString() });
      throw new EvaluateSchemaFunctionError(error.toString());
    }
  }

  /**
   * Handle notification event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   * @param {object} jsonSchemaObject The original JSON schema object for event configuration.
   */
  async handleNotification(resultContext, calculated, eventContext, jsonSchemaObject) {
    try {
      // Check that needed options were passed.
      if (
        !calculated.subject &&
        !calculated.fullText &&
        !calculated.emailsSubscribeToDigest?.length &&
        !calculated.shortText &&
        Object.keys(jsonSchemaObject).length > 0 // Events with empty schema will not fail.
      ) {
        throw new Error('Using event type \'notification\'. Required options were not passed.');
      }
      const sendResults = await this.sendNotification({
        emails: calculated.emails,
        emailsByUserId: calculated.emailsByUserId,
        emailsSubscribeToDigest: calculated.emailsSubscribeToDigest,
        emailsByUnitId: calculated.emailsByUnitId,
        emailsHeadByUnitId: calculated.emailsHeadByUnitId,
        emailsMemberByUnitId: calculated.emailsMemberByUnitId,
        emailsByIpn: calculated.emailsByIpn,
        emailTemplateId: calculated.emailTemplateId,
        phones: calculated.phones,
        subject: calculated.subject,
        fullText: calculated.fullText,
        shortText: calculated.shortText,
        sendToCabinetOnly: calculated.sendToCabinetOnly,
        messageCryptTypeId: calculated.messageCryptTypeId,
        importantMessage: calculated.importantMessage,
        hideImportantMessages: calculated.hideImportantMessages,
        sender: calculated.sender,
        eventContext,
      });
      resultContext.result = { ...resultContext.result, ...sendResults };
    } catch (error) {
      error.details = {
        emails: calculated.emails,
        emailsByUserId: calculated.emailsByUserId,
        emailsSubscribeToDigest: calculated.emailsSubscribeToDigest,
        emailsByUnitId: calculated.emailsByUnitId,
        emailsHeadByUnitId: calculated.emailsHeadByUnitId,
        emailsMemberByUnitId: calculated.emailsMemberByUnitId,
        emailsByIpn: calculated.emailsByIpn,
        emailTemplateId: calculated.emailTemplateId,
        phones: calculated.phones,
        subject: calculated.subject,
        fullText: calculated.fullText,
        shortText: calculated.shortText,
      };

      // Fail if no delays set.
      const onErrorTryResendAfter = jsonSchemaObject.onErrorTryResendAfter ? ['0m'].concat(jsonSchemaObject.onErrorTryResendAfter) : [];
      if (onErrorTryResendAfter.length === 0) {
        throw error;
      }

      // If have resend delays...
      /** @see runDaemon - using dueDate for sql select */
      resultContext.data.options = {
        emails: calculated.emails,
        emailsByUserId: calculated.emailsByUserId,
        emailsSubscribeToDigest: calculated.emailsSubscribeToDigest,
        emailsByUnitId: calculated.emailsByUnitId,
        emailsHeadByUnitId: calculated.emailsHeadByUnitId,
        emailsMemberByUnitId: calculated.emailsMemberByUnitId,
        emailsByIpn: calculated.emailsByIpn,
        emailTemplateId: calculated.emailTemplateId,
        phones: calculated.phones,
        subject: calculated.subject,
        fullText: calculated.fullText,
        shortText: calculated.shortText,
      };
      resultContext.data.dueDate = resultContext.data.dueDate || '';
      resultContext.data.dueDates = resultContext.data.dueDates || [];
      resultContext.data.statuses = resultContext.data.statuses || {};
      if (resultContext.data.dueDates.length === 0 && Object.keys(resultContext.data.statuses).length === 0) {
        resultContext.data.dueDates = await Promise.all(onErrorTryResendAfter.map((delay) => this.eventService.delay(delay)));
      }
      resultContext.data.dueDate = resultContext.data.dueDates.shift();
      resultContext.data.statuses[resultContext.data.dueDate] = 'Error: ' + ((error && error.toString()) || 'Unknown error!');

      // For next dueDate search by timestamp.
      resultContext.data.dueDate = resultContext.data.dueDates.shift();
      resultContext.dueDate = resultContext.data.dueDate;

      resultContext.done = false;
    }
  }

  /**
   * Handle delay event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} _eventContext The event context.
   * @param {object} _jsonSchemaObject The original JSON schema object.
   */
  async handleDelay(resultContext, calculated, _eventContext, _jsonSchemaObject) {
    resultContext.data.dueDate = await this.eventService.delay(calculated.delay);
    resultContext.dueDate = resultContext.data.dueDate;
    resultContext.done = false;
  }

  /**
   * Handle request event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleRequest(resultContext, calculated, eventContext) {
    const { workflowId, eventTemplateId, documents, events } = eventContext;
    const jsonSchemaObject = eventContext.eventTemplateJsonSchemaObject;
    const config = this.config;

    if (calculated.saveToBlockchain) {
      resultContext.result.saveToBlockchain = await this.handleRequestEvent({
        data: calculated.saveToBlockchain,
        type: 'blockchain',
        eventContext,
      });
    }
    if (calculated.getRegisters) {
      resultContext.result.getRegisters = await this.handleRequestEvent({
        data: calculated.getRegisters,
        type: 'registers',
        crudType: CRUD_TYPE.GET,
        eventContext,
      });
    }
    if (calculated.countRegisters) {
      resultContext.result.countRegisters = await this.handleRequestEvent({
        data: calculated.countRegisters,
        type: 'registersCount',
        crudType: CRUD_TYPE.GET,
        eventContext,
      });
    }
    if (calculated.getRegistersByPost) {
      resultContext.result.getRegistersByPost = await this.handleRequestEvent({
        data: calculated.getRegistersByPost,
        type: 'registers',
        crudType: CRUD_TYPE.GET,
        eventContext: { ...eventContext, requestMethod: 'POST' },
      });
    }
    if (calculated.saveToRegisters) {
      const registerKey = await this.handleRequestEvent({
        type: 'registerKeys',
        crudType: CRUD_TYPE.GET,
        data: jsonSchemaObject.saveToRegisters.keyId,
      });

      // Check validation identity.
      let signature;
      if (registerKey?.keySignature?.validationIdentity) {
        signature = await this.signRegisterRecord(calculated.saveToRegisters.data);
      }

      resultContext.result.saveToRegisters = await this.handleRequestEvent({
        data: { ...calculated.saveToRegisters, signature },
        type: 'registers',
        eventContext,
      });
    }
    if (calculated.saveRegisterRecordsToCsv) {
      resultContext.result.saveRegisterRecordsToCsv = await this.handleRequestEvent({
        data: {
          filestorage: this.filestorage,
          documentModel: this.documentModel,
          eventModel: this.eventModel,
          workflowId,
          eventTemplateId,
          ...calculated.saveRegisterRecordsToCsv,
        },
        type: 'saveRegisterRecordsToCsv',
        eventContext,
      });

      if (
        calculated.saveRegisterRecordsToCsv.inboxes &&
        resultContext.result.saveRegisterRecordsToCsv &&
        resultContext.result.saveRegisterRecordsToCsv.savedDocument
      ) {
        this.sendToInboxesIfNeedIt({
          workflowId,
          inboxesJsonSchema: calculated.saveRegisterRecordsToCsv.inboxes,
          document: resultContext.result.saveRegisterRecordsToCsv.savedDocument,
          documents,
          events,
        });
      }
    }
    if (calculated.saveToRegistersList) {
      const registerKey = await this.handleRequestEvent({
        type: 'registerKeys',
        crudType: CRUD_TYPE.GET,
        data: jsonSchemaObject.saveToRegistersList.keyId,
      });

      // Check validation identity.
      if (registerKey?.keySignature?.validationIdentity) {
        for (const saveToRegisters of calculated.saveToRegistersList) {
          saveToRegisters.signature = await this.signRegisterRecord(saveToRegisters.data);
        }
      }

      resultContext.result.saveToRegistersList = [];
      for (const saveToRegisters of calculated.saveToRegistersList) {
        const saveToRegistersResult = await this.handleRequestEvent({
          data: saveToRegisters,
          type: 'registers',
          eventContext,
        });

        resultContext.result.saveToRegistersList.push(saveToRegistersResult);
      }
    }
    if (calculated.updateRegisters) {
      const registerKey = await this.handleRequestEvent({
        type: 'registerKeys',
        crudType: CRUD_TYPE.GET,
        data: jsonSchemaObject.updateRegisters.keyId || calculated.updateRegisters.keyId,
      });

      // Check validation identity.
      let signature;
      if (registerKey?.keySignature?.validationIdentity) {
        signature = await this.signRegisterRecord(calculated.updateRegisters.data);
      }

      resultContext.result.updateRegisters = await this.handleRequestEvent({
        id: calculated.updateRegisters.recordId,
        data: { ...calculated.updateRegisters, signature },
        type: 'registers',
        crudType: CRUD_TYPE.UPDATE,
        eventContext,
      });
    }
    if (calculated.updateRegistersList) {
      const registerKey = await this.handleRequestEvent({
        type: 'registerKeys',
        crudType: CRUD_TYPE.GET,
        data: jsonSchemaObject.updateRegistersList.keyId,
      });

      // Check validation identity.
      if (registerKey?.keySignature?.validationIdentity) {
        for (const updateRegisters of calculated.updateRegistersList) {
          updateRegisters.signature = await this.signRegisterRecord(updateRegisters.data);
        }
      }

      resultContext.result.updateRegistersList = [];
      for (const updateRegisters of calculated.updateRegistersList) {
        const requestResult = await this.handleRequestEvent({
          id: updateRegisters.recordId,
          data: updateRegisters,
          type: 'registers',
          crudType: CRUD_TYPE.UPDATE,
          eventContext,
        });
        resultContext.result.updateRegistersList.push(requestResult);
      }
    }
    if (calculated.deleteRegisters) {
      resultContext.result.deleteRegisters = await this.handleRequestEvent({
        id: calculated.deleteRegisters,
        type: 'registers',
        crudType: CRUD_TYPE.DELETE,
        eventContext,
      });
    }
    if (calculated.deleteRegistersList) {
      const { recordIds, registerId, keyId, returnDeletedRecords = false } = calculated.deleteRegistersList;
      // Check all needed params are passed and correct.
      if (!registerId || !keyId || !recordIds) {
        throw new Error('deleteRegistersList: params recordIds, registerId and keyId must be defined.');
      }
      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        throw new Error('deleteRegistersList: param recordIds must be not empty array.');
      }

      const recordIdsLength = recordIds.length;
      const isKeyAllowedToDeleteMore100ThanRecords = config.requester?.registers?.keysAllowedToDeleteMoreThan100Records?.includes(
        Number(keyId),
      );
      if (recordIdsLength > 100) {
        if (!isKeyAllowedToDeleteMore100ThanRecords) {
          throw new Error('deleteRegistersList: deleted recods count mustn\'t be more than 100.');
        }
        log.save('delete-registers-list|delete-more-than-100-records', { keyId, recordIdsLength, workflowId, eventTemplateId }, 'warn');
      }

      const { concurrent, interval } = config.requester?.registers?.deleteRecordsQueue || {};
      const recordsToDelete = await this.getRecordsToDelete(
        recordIds,
        {
          returnRecords: returnDeletedRecords,
          concurrent,
          interval,
        },
        {
          keyId,
          workflowId,
          registerId,
          recordIdsLength,
          eventTemplateId,
        },
        eventContext,
      );

      if (recordsToDelete.length !== recordIdsLength) {
        log.save(
          'delete-registers-list|deleted-count-mismatch',
          {
            workflowId,
            eventTemplateId,
            keyId,
            recordIdsLength,
            recordsToDeleteLength: recordsToDelete.length,
          },
          'warn',
        );
        throw new Error('deleteRegistersList: passed recordIds must be pressent in passed registerId and keyId.');
      }
      const countToDeletePerAttempt = 20;
      const deletedResult = [];
      for (let i = 0; i < recordIdsLength; i += countToDeletePerAttempt) {
        const recodIdsToDeleteForAttempt = recordIds.slice(i, i + countToDeletePerAttempt);
        const deleteRecordsPromises = recodIdsToDeleteForAttempt.map((recordId) =>
          this.handleRequestEvent({
            id: recordId,
            type: 'registers',
            crudType: CRUD_TYPE.DELETE,
            eventContext,
          }),
        );
        const deletedResultPerAttempt = await Promise.all(deleteRecordsPromises);
        deletedResult.push(...deletedResultPerAttempt);
      }

      resultContext.result.deleteRegistersList = {
        registerId,
        keyId,
        recordIds,
        recordsCount: deletedResult.length,
        deletedRecords: returnDeletedRecords ? recordsToDelete : undefined,
      };
    }
    if (calculated.sendToExternalService) {
      resultContext.result.sendToExternalService = await this.handleRequestEvent({
        data: {
          ...calculated.sendToExternalService,
          workflowId,
          documents,
          events,
          filestorage: this.filestorage,
          sign: this.sign,
          taskModel: this.taskModel,
          documentModel: this.documentModel,
          documentAttachmentModel: this.documentAttachmentModel,
          eventModel: this.eventModel,
        },
        type: 'externalService',
        eventContext,
      });
      if (
        (calculated.sendToExternalService.inboxes || (calculated.accessJsonSchema || {}).inboxes) &&
        resultContext.result.sendToExternalService &&
        resultContext.result.sendToExternalService.sendingResult &&
        resultContext.result.sendToExternalService.sendingResult.savedDocument
      ) {
        this.sendToInboxesIfNeedIt({
          workflowId,
          inboxesJsonSchema: calculated.sendToExternalService.inboxes || (calculated.accessJsonSchema || {}).inboxes,
          document: resultContext.result.sendToExternalService.sendingResult.savedDocument,
          documents,
          events,
        });
      }
    }
    if (calculated.getDocument) {
      resultContext.result.getDocument = await this.handleRequestEvent({
        data: {
          ...calculated.getDocument,
          options: {
            ...(calculated.getDocument.options || {}),
            workflowId,
            eventTemplateId,
            documents,
            events,
          },
        },
        type: 'document',
        crudType: CRUD_TYPE.GET,
        eventContext,
      });
    }
    if (calculated.saveDocument) {
      resultContext.result.saveDocument = await this.handleRequestEvent({
        data: {
          ...calculated.saveDocument,
          options: {
            ...(calculated.saveDocument.options || {}),
            workflowId,
            eventTemplateId,
            documents,
            events,
            filestorage: this.filestorage,
            documentModel: this.documentModel,
            documentAttachmentModel: this.documentAttachmentModel,
            eventModel: this.eventModel,
            sign: this.sign,
          },
        },
        type: 'document',
        eventContext,
      });
      const saveDocInboxes = calculated.saveDocument.inboxes || (calculated.accessJsonSchema || {}).inboxes;
      if (saveDocInboxes && resultContext.result.saveDocument && resultContext.result.saveDocument.savedDocument) {
        this.sendToInboxesIfNeedIt({
          workflowId,
          inboxesJsonSchema: saveDocInboxes,
          document: resultContext.result.saveDocument.savedDocument,
          documents,
          events,
        });
      }
    }
    if (calculated.serviceRepositoryData) {
      resultContext.result.serviceRepositoryData = await this.handleRequestEvent({
        data: calculated.serviceRepositoryData,
        type: 'servicesRepository',
        eventContext,
      });
    }
  }

  /**
   * Handle stop event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleStop(resultContext, calculated, eventContext) {
    const { workflowId, eventTemplateId } = eventContext;
    resultContext.result.stop = await this.eventService.stop(
      workflowId,
      eventTemplateId,
      this.taskModel,
      this.documentModel,
      this.eventModel,
      calculated.taskTemplateIdsFilter,
      calculated.eventTemplateIdsFilter,
    );
  }

  /**
   * Handle unit event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleUnit(resultContext, calculated, eventContext) {
    const { eventTemplate, workflowId } = eventContext;
    const jsonSchemaObject = eventContext.eventTemplateJsonSchemaObject;

    if (calculated.eventUnitType === 'create') {
      resultContext.result.create = await this.eventService.unit(
        {
          unitData: calculated.unitData,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          workflowId,
          eventTemplate,
        },
        calculated.eventUnitType,
      );
    } else if (calculated.eventUnitType === 'update') {
      resultContext.result.update = await this.eventService.unit(
        {
          unitData: calculated.unitData,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          taskModel: this.taskModel,
          workflowId,
          eventTemplate,
          removeFromBaseUnits: jsonSchemaObject.removeFromBaseUnits || false,
        },
        calculated.eventUnitType,
      );
    }
  }

  /**
   * Handle workflow event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleWorkflow(resultContext, calculated, eventContext) {
    const { workflowId } = eventContext;
    const jsonSchemaObject = eventContext.eventTemplateJsonSchemaObject;

    if (calculated.createWorkflows || calculated.createWorkflowsExternal) {
      resultContext.result.createWorkflows = await this.eventService.workflow({
        workflowParentId: workflowId,
        createWorkflows: calculated.createWorkflows,
        createWorkflowsExternal: calculated.createWorkflowsExternal,
        jsonSchemaObject,
      });
    } else if (calculated.sendStatusExternal || calculated.sendStatus) {
      const { status, workflowIds } = await this.eventService.workflow({
        workflowParentId: workflowId,
        sendStatusExternal: calculated.sendStatusExternal,
        sendStatus: calculated.sendStatus,
        jsonSchemaObject,
      });
      resultContext.result.sendStatus = status;
      resultContext.result.workflowIds = workflowIds;
    } else if (calculated.setNewTasksPerformers) {
      const { taskIds, newPerformerUsers, newPerformerUserNames, fromPerformerUsers } = calculated.setNewTasksPerformers;
      resultContext.result.newTasksPerformers = await this.eventService.workflow({
        taskIds,
        newPerformerUsers,
        newPerformerUserNames,
        fromPerformerUsers,
        jsonSchemaObject,
      });
    }
  }

  /**
   * Handle clear event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleClear(resultContext, calculated, eventContext) {
    const { workflowId, eventTemplateId, documents, events } = eventContext;
    const jsonSchemaObject = eventContext.eventTemplateJsonSchemaObject;
    resultContext.result.clear = await this.eventService.clear({
      workflowId,
      eventTemplateId,
      documents,
      events,
      jsonSchemaObject,
    });
  }

  /**
   * Handle file event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleFile(resultContext, calculated, eventContext) {
    const { workflowId, documents, events } = eventContext;
    resultContext.result.saveDocument = await this.eventService.file(eventContext);

    if ((calculated.accessJsonSchema || {}).inboxes && resultContext.result.saveDocument && resultContext.result.saveDocument.savedDocument) {
      this.sendToInboxesIfNeedIt({
        workflowId,
        inboxesJsonSchema: (calculated.accessJsonSchema || {}).inboxes,
        document: resultContext.result.saveDocument.savedDocument,
        documents,
        events,
      });
    }
  }

  /**
   * Handle user event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleUser(resultContext, calculated, eventContext) {
    const { eventTemplate, workflowId } = eventContext;

    if (calculated.eventUserType === 'addMember' || calculated.eventUserType === 'addMemberIpn') {
      resultContext.result.addMember = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'addRequestedMember') {
      resultContext.result.addRequestedMember = await this.eventService.user(
        {
          ipn: calculated.ipn,
          unitId: calculated.unitId,
          unitModel: this.unitModel,
          userName: calculated.userName,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'addMemberIpnList') {
      resultContext.result.addMemberIpnList = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'addHeadIpnList') {
      resultContext.result.addHeadIpnList = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'addHead' || calculated.eventUserType === 'addHeadIpn') {
      resultContext.result.addHead = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeMember') {
      resultContext.result.removeMember = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          taskModel: this.taskModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (['addHeadList', 'addMemberList', 'removeMemberList', 'removeHeadList'].includes(calculated.eventUserType)) {
      resultContext.result[calculated.eventUserType] = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userIdList: calculated.userIdList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          taskModel: this.taskModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeHead') {
      resultContext.result.removeHead = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          taskModel: this.taskModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeMemberIpn') {
      resultContext.result.removeMemberIpn = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeMemberIpnList') {
      resultContext.result.removeMemberIpnList = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeHeadIpn') {
      resultContext.result.removeHeadIpn = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipn: calculated.ipn,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeHeadIpnList') {
      resultContext.result.removeHeadIpnList = await this.eventService.user(
        {
          unitId: calculated.unitId,
          userId: calculated.userId,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          userData: calculated.userData,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'updateUser') {
      resultContext.result.updateUser = await this.eventService.user(
        { userId: calculated.userId, userData: calculated.userData, workflowId, eventTemplate },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'searchUser') {
      resultContext.result.searchUser = await this.eventService.user(
        { searchData: calculated.searchData, unitModel: this.unitModel, workflowId, eventTemplate },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'addMembersToUnitsIpn') {
      resultContext.result.addMembersToUnitsIpn = await this.eventService.user(
        {
          unitIdList: calculated.unitIdList,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeMembersFromUnitsIpn') {
      resultContext.result.removeMembersFromUnitsIpn = await this.eventService.user(
        {
          unitIdList: calculated.unitIdList,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    } else if (calculated.eventUserType === 'removeMembersFromUnitsByIpn') {
      resultContext.result.removeMembersFromUnitsByIpn = await this.eventService.user(
        {
          unitIdList: calculated.unitIdList,
          ipnList: calculated.ipnList,
          unitModel: this.unitModel,
          accessHistoryModel: this.accessHistoryModel,
          taskModel: this.taskModel,
          workflowId,
          eventTemplate,
          userName: calculated.userName,
          initUserName: calculated.initUserName,
          initUserId: calculated.initUserId,
        },
        calculated.eventUserType,
      );
    }
  }

  /**
   * Handle meta event type.
   * @param {object} resultContext Context object with result, data, dueDate, done.
   * @param {object} calculated Pre-calculated values from schema evaluation.
   * @param {object} eventContext The event context with workflow, document, and model references.
   */
  async handleMeta(resultContext, calculated, eventContext) {
    const { workflowId } = eventContext;
    const config = this.config;

    if (!calculated.metaObject) {
      return;
    }

    let task;
    try {
      task = await this.taskModel.findById(calculated.taskId);
    } catch (error) {
      throw new EvaluateSchemaFunctionError('Cannot find Task by eventMeta.update.taskId schema function.', { cause: error.toString() });
    }
    if (!task) {
      throw new EvaluateSchemaFunctionError('Task not found by eventMeta.update.taskId schema function.');
    }

    if (task.workflowId !== workflowId) {
      // Check workflow extra permissions if it is not current workflow task.
      const taskWorkflow = await this.workflowModel.findById(task.workflowId);
      const allowUpdateFromAnotherWorkflow = config?.custom?.workflowExtraPermissions?.allowUpdateFromAnotherWorkflow || [];
      if (!allowUpdateFromAnotherWorkflow.includes(taskWorkflow.workflowTemplateId)) {
        throw new EvaluateSchemaFunctionError('Permission error. Cannot update task from another workflow. Check config.', {
          cause: {
            taskWorkflowTemplateIdToUpdate: taskWorkflow.workflowTemplateId,
            config: {
              allowUpdateFromAnotherWorkflow: allowUpdateFromAnotherWorkflow,
            },
          },
        });
      }
    }

    let { meta = {} } = task;
    if (calculated.eventMeta === 'update') {
      meta = { ...meta, ...calculated.metaObject };
    } else if (calculated.eventMeta === 'delete') {
      for (const key of Object.keys(calculated.metaObject)) {
        if (meta[key] === calculated.metaObject[key]) delete meta[key];
      }
    }
    await this.taskModel.model.update({ meta }, { where: { id: calculated.taskId } });
    resultContext.result.meta = meta;
  }

  /**
   * Create from message.

   * @param {object} messageObject AMQP message object.
   */
  async createFromMessage(messageObject) {
    let workflowId;
    let eventTemplate;
    let eventTemplateId;
    let eventTypeId;
    let jsonSchemaObject;
    let name;
    let dueDate;
    try {
      // Define workflow.
      workflowId = messageObject.workflowId;
      eventTemplateId = messageObject.eventTemplateId;

      // Fetch event template with caching
      eventTemplate = await this.eventTemplateModel.findByIdCached(eventTemplateId);
      eventTypeId = eventTemplate.eventTypeId;
      name = eventTemplate.name;
      const jsonSchema = eventTemplate.jsonSchema;
      jsonSchemaObject = jsoncParser.parse(jsonSchema || '{}');
      const { isCurrentOnly = true } = jsonSchemaObject;

      // Fetch event type with caching
      const eventType = await this.eventTypeModel.findByIdCached(eventTypeId);

      // Obtain events and documents in parallel
      const [events, documents] = await Promise.all([
        this.eventModel.getEventsByWorkflowId(workflowId),
        this.taskModel.getDocumentsByWorkflowId(workflowId, isCurrentOnly),
      ]);

      // Retrieve all workflow document attachments
      const attachments = await this.documentAttachmentModel.getByDocumentIds(documents.map((document) => document.id));
      for (const document of documents) {
        document.attachments = attachments.filter((attachment) => attachment.documentId === document.id);
      }

      // Initialize result context
      const resultContext = {
        data: {},
        done: true,
        result: {},
        dueDate: undefined,
      };

      // Calculate all event data
      const calculated = await this.calculateEventData(workflowId, jsonSchemaObject, documents, events, eventTemplate.id);

      // Define event context.
      const eventContext = {
        workflowId,
        eventTemplateId,
        eventTemplate,
        eventTemplateJsonSchemaObject: jsonSchemaObject,
        documents,
        events,
        documentModel: this.documentModel,
        eventModel: this.eventModel,
        filestorage: this.filestorage,
      };

      // Check if events with the same template are more than 50.
      const eventsWithTheSameTemplate = events.filter((event) => event.eventTemplateId === eventTemplateId);
      if (eventsWithTheSameTemplate.length >= (config.system_notifier?.maxLoops ?? 50)) {
        jsonSchemaObject = { ...jsonSchemaObject, notFailOnError: false };
        throw new Error('Too many loops.');
      }

      // Handle event accordance to defined type.
      switch (eventType.name) {
        case 'notification':
          await this.handleNotification(resultContext, calculated, eventContext, jsonSchemaObject);
          break;
        case 'delay':
          await this.handleDelay(resultContext, calculated, eventContext, jsonSchemaObject);
          break;
        case 'request':
          await this.handleRequest(resultContext, calculated, eventContext);
          break;
        case 'stop':
          await this.handleStop(resultContext, calculated, eventContext);
          break;
        case 'unit':
          await this.handleUnit(resultContext, calculated, eventContext);
          break;
        case 'user':
          await this.handleUser(resultContext, calculated, eventContext);
          break;
        case 'workflow':
          await this.handleWorkflow(resultContext, calculated, eventContext);
          break;
        case 'meta':
          if (calculated.metaObject) {
            await this.handleMeta(resultContext, calculated, eventContext);
          }
          break;
        case 'clear':
          await this.handleClear(resultContext, calculated, eventContext);
          break;
        case 'file':
          await this.handleFile(resultContext, calculated, eventContext);
          break;
        default:
          throw new Error(ERROR_WRONG_EVENT_TYPE);
      }

      // Save event handling result.
      resultContext.data.result = resultContext.result;

      if (typeof messageObject.debugId !== 'undefined' && messageObject && messageObject.workflowId) {
        await this.workflowDebugModel.create({
          id: messageObject.debugId,
          workflowId: messageObject.workflowId,
          serviceName: 'event',
          data: { result: resultContext.result, queueMessage: messageObject },
        });
      } else {
        const resultSavedDocument =
          (resultContext.result &&
            resultContext.result.sendToExternalService &&
            resultContext.result.sendToExternalService.sendingResult &&
            resultContext.result.sendToExternalService.sendingResult.savedDocument) ||
          (resultContext.result && resultContext.result.saveDocument && resultContext.result.saveDocument.savedDocument);

        const [workflowTemplate, lastVersionWorkflowHistory] = await Promise.all([
          this.workflowTemplateModel.findByIdCached(messageObject.workflowTemplateId),
          this.workflowHistoryModel.findLastVersionByWorkflowTemplateId(messageObject.workflowTemplateId),
        ]);

        const createdEvent = await this.eventModel.create({
          eventTemplateId,
          workflowId,
          eventTypeId,
          name,
          data: resultContext.data,
          done: resultContext.done,
          documentId: (resultSavedDocument && resultSavedDocument.id) || null,
          dueDate: resultContext.dueDate,
          createdBy: SYSTEM_USER,
          updatedBy: SYSTEM_USER,
          version: lastVersionWorkflowHistory && lastVersionWorkflowHistory.version,
        });
        if (!createdEvent) {
          throw new Error('Event wasn\'t created.');
        }

        // Set workflow status.
        try {
          await this.setWorkflowStatus(workflowId, workflowTemplate, parseInt(eventTemplateId), eventTemplate.id, {
            documents,
            events,
          });
        } catch (error) {
          log.save('set-workflow-status-error', { workflowId, error: error.toString() });
          await this.workflowErrorModel.create(
            {
              error: 'Can not set the workflow status.',
              details: {
                message: error.toString(),
              },
              queueMessage: messageObject,
            },
            'warning',
          );
        }

        if (resultContext.done) {
          // Send message to RabbitMQ.
          const outMessage = { workflowId, eventId: createdEvent.id };
          if (typeof messageObject.onlyExecute === 'undefined') {
            global.messageQueue?.produce?.(outMessage);
          }

          // Save custom logs.
          this.customLogs.saveCustomLog({ operationType: 'event-created', event: createdEvent, workflowId: createdEvent.workflowId });
        }
      }
    } catch (error) {
      try {
        // Create error.
        log.save('event-handling-by-message-from-queue-error', { messageObject, error: error.toString(), stack: error.stack, details: error.cause });

        // If enabled debug model.
        if (typeof messageObject.debugId !== 'undefined' && messageObject && messageObject.workflowId) {
          await this.workflowDebugModel.create({
            id: messageObject.debugId,
            workflowId: messageObject.workflowId,
            serviceName: 'event',
            data: { error: error.toString(), queueMessage: messageObject, cause: error.cause, details: error.cause },
          });
          return true;
        }

        // Define params.
        const { notFailOnError } = jsonSchemaObject || {};

        // Retry if need it.
        const retryInfo = this.getRetryInfo(messageObject, jsonSchemaObject);
        if (retryInfo) {
          // Retry.
          const { retryMessage, postponedTime } = retryInfo;
          if (typeof messageObject.onlyExecute === 'undefined') {
            global.messageQueue.produce(retryMessage, postponedTime);
          }

          // Save event was failed, async.
          (async () => {
            // Event entity.
            try {
              const lastVersionWorkflowHistory = await this.workflowHistoryModel.findLastVersionByWorkflowTemplateId(
                messageObject.workflowTemplateId,
              );

              await this.eventModel.create({
                eventTemplateId,
                workflowId,
                eventTypeId,
                name,
                data: { error: error.toString(), cause: error.cause, details: error.details, notFailOnError, retryInfo, messageObject, retry: true },
                done: false,
                createdBy: SYSTEM_USER,
                updatedBy: SYSTEM_USER,
                version: lastVersionWorkflowHistory && lastVersionWorkflowHistory.version,
              });
            } catch (error) {
              log.save('event-error-catch-creating-error', { messageObject, error: error.toString() });
            }

            // Workflow error entity.
            try {
              const type = 'warning';
              await this.workflowErrorModel.create(
                {
                  error: error.toString(),
                  details: error.details,
                  cause: error.cause,
                  queueMessage: messageObject,
                  retry: true,
                },
                type,
              );
            } catch (error) {
              log.save('workflow-id-not-found-error', { messageObject, error: error.toString() });
            }
          })();

          return true;
        }

        // Check log type.
        try {
          const type = notFailOnError ? 'warning' : 'error';
          await this.workflowErrorModel.create(
            {
              error: error.toString(),
              details: error.details,
              cause: error.cause,
              queueMessage: messageObject,
              traceId: getTraceId(),
            },
            type,
          );
        } catch (error) {
          log.save('workflow-id-not-found-error', { messageObject, error: error.toString() });
        }

        // Check if no need to fail on error.
        if (notFailOnError) {
          let createdEvent;
          try {
            const lastVersionWorkflowHistory = await this.workflowHistoryModel.findLastVersionByWorkflowTemplateId(messageObject.workflowTemplateId);

            createdEvent = await this.eventModel.create({
              eventTemplateId,
              workflowId,
              eventTypeId,
              name,
              data: { error: error.toString(), cause: error.cause, details: error.details, notFailOnError, messageObject },
              done: false,
              dueDate,
              createdBy: SYSTEM_USER,
              updatedBy: SYSTEM_USER,
              version: lastVersionWorkflowHistory && lastVersionWorkflowHistory.version,
            });
          } catch (error) {
            log.save('event-error-catch-creating-error', { messageObject, error: error.toString() });
          }

          // Send message to RabbitMQ.
          const outMessage = { workflowId, eventId: createdEvent.id };
          if (typeof messageObject.onlyExecute === 'undefined') {
            global.messageQueue.produce(outMessage);
          }
        } else {
          await this.workflowModel.setError(messageObject.workflowId);
        }

        // Try to inform admins.
        try {
          // Inform only if we need to fail on error.
          if (!notFailOnError) {
            const [workflowTemplate, eventTemplate] = await Promise.all([
              this.workflowTemplateModel.findIdAndNameAndErrorsSubscribersByIdCached(messageObject.workflowTemplateId),
              this.eventTemplateModel.findIdAndNameByIdCached(messageObject.eventTemplateId),
            ]);

            await this.systemNotifier.sendEmails({
              workflowId: messageObject.workflowId,
              workflowTemplateName: workflowTemplate?.name,
              workflowErrorsSubscribers: workflowTemplate?.errorsSubscribers,
              eventTemplateId: eventTemplate?.id,
              eventTemplateName: eventTemplate?.name,
              error: error?.message,
            });
          }
        } catch (error) {
          log.save('system-notifier-error', { error: error.toString(), stack: error.stack }, 'error');
        }
      } catch (error) {
        log.save('unknown-error', { error: (error && error.toString()) || error, messageObject });
      }
    }

    return true;
  }

  /**
   * Get retry info.
   * @param {object} message Message object.
   * @param {object} jsonSchema JSON schema object.
   * @returns {{retryMessage: {retryIterator: number, workflowId, eventTemplateId}, postponedTime}} Retry info.
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
   * Run daemon.
   */
  async runDaemon() {
    let isRunning = false;

    this.interval = setInterval(async () => {
      if (isRunning === false) {
        isRunning = true;
      } else {
        return;
      }

      // Event type - delay.
      try {
        // Handle running events.
        const events = await this.runningEvents.lockAndGetRunningEvents();
        for (const event of events) {
          // Set done.
          const doneEvent = await this.eventModel.setDone(event.id);

          // Send message to RabbitMQ.
          global.messageQueue.produce({
            workflowId: doneEvent.workflowId,
            eventId: event.id,
          });
        }

        // Unlock old locked events.
        await this.eventModel.unlockOldLockedEvents();
      } catch (error) {
        log.save('daemon-delay-error', error.toString());
      }

      // Event type - notification
      try {
        const events = await this.eventModel.getPostponedEvents();
        for (const event of events) {
          const {
            emails,
            emailsByUserId,
            emailsSubscribeToDigest,
            emailsByUnitId,
            emailsHeadByUnitId,
            emailsMemberByUnitId,
            emailsByIpn,
            emailTemplateId,
            phones,
            subject,
            fullText,
            shortText,
          } = { ...event.data.options };
          try {
            // Try one more time.
            event.data.result = event.data.result || {};

            const sendResults = await this.sendNotification({
              emails,
              emailsByUserId,
              emailsSubscribeToDigest,
              emailsByUnitId,
              emailsHeadByUnitId,
              emailsMemberByUnitId,
              emailsByIpn,
              emailTemplateId,
              phones,
              subject,
              fullText,
              shortText,
            });
            event.data.result = { ...event.data.result, ...sendResults };

            // Update event.
            await this.eventModel.model.update(
              { data: event.data, done: true },
              {
                where: { id: event.id },
                returning: true,
              },
            );

            // Send message to RabbitMQ.
            global.messageQueue.produce({ workflowId: event.workflowId, eventId: event.id });
          } catch (error) {
            event.data.statuses[event.data.dueDate] = 'Error: ' + ((error && error.toString()) || 'Unknown error!');
            if (event.data.dueDates && event.data.dueDates.length) {
              event.data.dueDate = event.data.dueDates.shift();
            } else {
              delete event.data.dueDate;
            }

            // Update event.
            await this.eventModel.model.update(
              { data: event.data },
              {
                where: { id: event.id },
                returning: true,
              },
            );
          }
        }
      } catch (error) {
        log.save('daemon-notification-error', error.toString());
      }

      isRunning = false;
    }, config.delayer.interval * 1000);
  }

  /**
   * Stop daemon.
   */
  async stopDaemon() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /**
   * Send notification.
   * @param {emails, emailsByUserId, emailsSubscribeToDigest, emailsByUnitId, emailsHeadByUnitId, emailsMemberByUnitId, emailTemplateId, phones, subject, fullText, shortText, sendToCabinetOnly, messageCryptTypeId, importantMessage, hideImportantMessages, sender} options Sending options.
   * @returns {Promise<{notificationEmail, notificationSms}>} Sending result promise.
   */
  async sendNotification(options) {
    // Define params.
    let result = {};
    const {
      emails,
      emailsByUserId,
      emailsSubscribeToDigest,
      emailsByUnitId,
      emailsHeadByUnitId,
      emailsMemberByUnitId,
      emailsByIpn,
      emailTemplateId,
      phones,
      subject,
      fullText,
      shortText,
      sendToCabinetOnly = false,
      messageCryptTypeId,
      importantMessage,
      hideImportantMessages,
      sender,
      eventContext,
    } = { ...options };

    // Define users by units.
    const emailsByUserIdFromUnit = await this.getEmailsByUserIdFromUnit(emailsByUnitId, emailsHeadByUnitId, emailsMemberByUnitId);

    // Send messages.
    if (emails.length > 0)
      result.notificationEmail = await this.eventService.notify(
        'email',
        emails,
        subject,
        fullText,
        emailTemplateId,
        sendToCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        eventContext,
      );
    if (emailsByUserId.length > 0)
      result.notificationEmailByUserId = await this.eventService.notify(
        'email',
        emailsByUserId,
        subject,
        fullText,
        emailTemplateId,
        sendToCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        eventContext,
      );
    if (emailsByUserIdFromUnit.length > 0)
      result.notificationEmailByUserId = await this.eventService.notify(
        'email',
        emailsByUserIdFromUnit,
        subject,
        fullText,
        emailTemplateId,
        sendToCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        eventContext,
      );
    if (emailsSubscribeToDigest.length > 0)
      result.notificationEmailsSubscribeToDigest = await this.eventService.notify('digest', emailsSubscribeToDigest);
    if (emailsByIpn.length > 0)
      result.notificationEmailByIpn = await this.eventService.notify(
        'email',
        emailsByIpn,
        subject,
        fullText,
        emailTemplateId,
        sendToCabinetOnly,
        messageCryptTypeId,
        importantMessage,
        sender,
        eventContext,
      );
    if (phones.length > 0) result.notificationSms = await this.eventService.notify('sms', phones, shortText, shortText);
    if (hideImportantMessages && hideImportantMessages.length > 0)
      result.hideImportantMessages = await this.eventService.notify('hideImportantMessages', hideImportantMessages);

    // Check send SMS sending success.
    const sendResult =
      result.notificationSms &&
      result.notificationSms.response &&
      result.notificationSms.response.sendBySms &&
      result.notificationSms.response.sendBySms.sendResult;
    if (sendResult) {
      if (Array.isArray(sendResult)) {
        for (const responseMessage of sendResult) {
          for (const part of NOTIFICATION_FAILED_RESPONSE_MESSAGE_PARTS) {
            if (responseMessage.indexOf(part) >= 0) {
              throw new Error(JSON.stringify(sendResult));
            }
          }
        }
      } else {
        log.save('notification-sms-send-result-error', { error: result.notificationSms.response.sendBySms }, 'warn');
      }
    }

    // TODO: Check send email sending success.

    // Return sending result.
    return result;
  }

  /**
   * @private
   * @param {object} params Params.
   * @param {any} params.id ID.
   * @param {object} params.data Data.
   * @param {'blockchain'|'registers'|'registerKeys'|'externalService'|'document'} params.type Requester type.
   * @param {'get'|'create'|'update'|'delete'} params.crudType CRUD type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} params.eventContext Event context.
   * @returns {Promise<object>} Handling result promise.
   */
  async handleRequestEvent({ id, data, type, crudType = CRUD_TYPE.CREATE, eventContext }) {
    return await this.eventService.request({ id, data, type, crudType, eventContext });
  }

  /**
   * Send to inboxes if need it.
   * @param {object} params Params.
   * @param {string} params.workflowId Workflow ID.
   * @param {number} params.workflowTemplateId Workflow template ID.
   * @param {object} params.inboxesJsonSchema Inboxes json.
   * @param {object} params.document Document.
   * @param {object[]} params.documents Documents.
   * @returns {Promise<undefined>} Promise.
   */
  async sendToInboxesIfNeedIt({ workflowId, workflowTemplateId, inboxesJsonSchema, document, documents, events }) {
    // Get document template.
    const { id: documentId, documentTemplateId, number: documentNumber, } = document;
    const documentTemplate = await this.documentTemplateModel.findByIdCached(documentTemplateId);

    // Define users list.
    const { name: documentTemplateName, jsonSchema: { fileName } } = documentTemplate;
    const usersList = await this.getUsersListForInboxes({ inboxesJsonSchema, workflowId, workflowTemplateId, documents });

    // Save for all users.
    const nameTemplate = inboxesJsonSchema.fileName || fileName || documentTemplateName;
    for (const user of usersList) {
      await this.userInboxModel.create({
        userId: user,
        documentId,
        name: this.sandbox.evalWithArgs(nameTemplate, [documents, events], { checkArrow: true }),
        number: documentNumber,
      });
    }
  }

  /**
   * Get users list for inboxes.
   * @param {object} params Params.
   * @param {{workflowCreator?: true, users?: string}} params.inboxesJsonSchema Inboxes JSON schema. Sample: { users: '(documents) => { const user = documents.find(item => item.documentTemplateId === 4).createdBy; return [ user ]; }' }.
   * @param {string} params.workflowId Workflow ID.
   * @param {number} params.workflowTemplateId Workflow template ID.
   * @returns {Promise<string[]>}
   */
  async getUsersListForInboxes({ inboxesJsonSchema, workflowId, workflowTemplateId, documents }) {
    // Define params.
    const { workflowCreator, users: usersStringifiedFunction } = inboxesJsonSchema;

    let users = [];

    // Handle if workflow creator.
    if (workflowCreator) {
      const workflow = await this.workflowModel.findById(workflowId);
      const { createdBy: workflowCreatedBy } = workflow;
      log.save('save-to-inboxes|users-definition-by-workflow-created-by|defined', { workflowCreatedBy, inboxesJsonSchema, workflowId });
      users.push(workflowCreatedBy);
    }

    // Handle function.
    if (usersStringifiedFunction) {
      // Define and return users list.
      try {
        const usersFunctionResponse = this.sandbox.evalWithArgs(usersStringifiedFunction, [documents], { workflowTemplateId });
        const usersAfterEvalFunction =
          Array.isArray(usersFunctionResponse) && usersFunctionResponse.every((v) => typeof v === 'string')
            ? usersFunctionResponse
            : typeof usersFunctionResponse === 'string'
              ? [usersFunctionResponse]
              : [];
        log.save('save-to-inboxes|users-definition-by-function|defined', { users, usersFunctionResponse, inboxesJsonSchema, workflowId });

        users = users.concat(usersAfterEvalFunction);
      } catch (error) {
        log.save('save-to-inboxes|users-definition-by-function|error', { inboxesJsonSchema, workflowId, error: error && error.toString() });
      }
    }

    return [...new Set(users)];
  }

  /**
   * Transform function to async.
   * @param {string} functionString Function string.
   * @returns {string} Async function string.
   */
  transformFunctionToAsync(functionString) {
    // Define params.
    const ASYNC_FUNCTIONS_INSIDE = ['plinkFromFilestoragePdf', 'plinkFromFilestorageAttach'];
    const isFunctionStringContainsAsyncFunction = ASYNC_FUNCTIONS_INSIDE.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
    );

    // Return as is if async function not used.
    if (!isFunctionStringContainsAsyncFunction) {
      return functionString;
    }

    // Transform to async.
    let asyncFunctionString = functionString;
    if (!asyncFunctionString.startsWith('async')) {
      asyncFunctionString = `async ${asyncFunctionString}`;
    }
    for (const asyncFunctionInside of ASYNC_FUNCTIONS_INSIDE) {
      asyncFunctionString = asyncFunctionString.replace(new RegExp(asyncFunctionInside, 'g'), `await ${asyncFunctionInside}`);
    }

    // Return transformed function.
    return asyncFunctionString;
  }

  /**
   * Set workflow status.
   * @private
   * @param {string} workflowId Workflow ID.
   * @param {object} workflowTemplate Workflow template.
   * @param {number} eventTemplateId Event template ID.
   * @param {number} workflowTemplateId Workflow template ID.
   */
  async setWorkflowStatus(workflowId, workflowTemplate, eventTemplateId, workflowTemplateId, { documents, events }) {
    if (!Array.isArray(workflowTemplate.data.statuses)) {
      return;
    }

    const status = workflowTemplate.data.statuses.find((v) => v.eventTemplateId && v.eventTemplateId === eventTemplateId);
    if (!status || (!status.statusId && !status.calculate)) {
      return;
    }

    if (status.calculate) {
      const frontUrl = this.config?.notifier?.email?.templateParams?.frontUrl;
      if (typeof frontUrl === 'string') {
        status.calculate = status.calculate.replaceAll('{{frontUrl}}', frontUrl);
      }

      const calculatedStatus = this.sandbox.evalWithArgs(status.calculate, [documents, events], { workflowTemplateId });
      if (!Array.isArray(calculatedStatus) || calculatedStatus.length === 0) {
        return;
      }

      if (
        !calculatedStatus.every((v) => {
          if (
            typeof v.type === 'string' &&
            ['doing', 'done', 'rejected'].includes(v.type.toLowerCase()) &&
            typeof v.label === 'string' &&
            typeof v.description === 'string'
          ) {
            return true;
          }
          return false;
        })
      ) {
        log.save('set-workflow-status|status-calculate-error', { workflowId, status });
        throw new Error('Invalid status.');
      }

      const nonTabedStatuses = calculatedStatus.filter((s) => s.isStatusesTab === false);
      const nonTabedStatusesLength = nonTabedStatuses.length;

      if (nonTabedStatusesLength === 0) {
        log.save('set-workflow-status|statusId-calculate-error|non-tabed-statuses-dont-exist', { workflowId, calculatedStatus });
        throw new Error('Invalid status. Non tabed statuses don\'t exist.');
      }

      let statusId;
      if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'doing') {
        statusId = 1;
      } else if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'done') {
        statusId = 2;
      } else if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'rejected') {
        statusId = 3;
      }
      await models.workflow.setStatus(workflowId, statusId, calculatedStatus);
      log.save('set-workflow-status|status-defined', { workflowId, statusId, calculatedStatus, workflowTemplateId: workflowTemplate.id });
    } else if (status.statusId) {
      await models.workflow.setStatus(workflowId, status.statusId);
      log.save('set-workflow-status|status-defined', { workflowId, statusId: status.statusId, workflowTemplateId: workflowTemplate.id });
    }
  }

  /**
   * Sign register record.
   * @param {Object} data Record data to sign.
   * @returns {Promise<{error?: string, data?: Object}>}
   */
  async signRegisterRecord(data) {
    try {
      // PostgreSQL JSONB type has its own sort format. We need alphabetical sorting to correctly verify the signature.
      const sortedData = this.recursiveSort(data);

      const recordDataInBase64 = Buffer.from(JSON.stringify(sortedData)).toString('base64');
      const signResponse = await this.sign.sign(recordDataInBase64, true, undefined, true);
      return signResponse.data;
    } catch (error) {
      log.save('sign-register-record-error', { error: error.toString() || error, stack: error.stack });
      throw error;
    }
  }

  /**
   * @private
   * @param {Object} obj Object to sort.
   * @returns {Object} Sorted object.
   */
  recursiveSort(obj) {
    if (typeof obj != 'object' || obj instanceof Array || obj instanceof Date) {
      return obj;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return obj;
    }
    const sortedObject = {};
    keys.sort().forEach((key) => (sortedObject[key] = this.recursiveSort(obj[key])));

    return sortedObject;
  }

  /**
   * @private
   */
  async getEmailsByUserIdFromUnit(emailsByUnitId, emailsHeadByUnitId, emailsMemberByUnitId) {
    const emailsByUserIdFromUnit = [];

    const promises = [];

    if (emailsByUnitId.length > 0) {
      promises.push(this.unitModel.getUsersFromUnits(emailsByUnitId).then(({ all: allUserIds }) => emailsByUserIdFromUnit.push(...allUserIds)));
    }
    if (emailsHeadByUnitId.length > 0) {
      promises.push(
        this.unitModel.getUsersFromUnits(emailsHeadByUnitId).then(({ heads: headUserIds }) => emailsByUserIdFromUnit.push(...headUserIds)),
      );
    }
    if (emailsMemberByUnitId.length > 0) {
      promises.push(
        this.unitModel.getUsersFromUnits(emailsMemberByUnitId).then(({ members: memberUserIds }) => emailsByUserIdFromUnit.push(...memberUserIds)),
      );
    }

    await Promise.all(promises);

    return [...new Set(emailsByUserIdFromUnit)];
  }

  /**
   * Fetch record list by ID for subsequent deletion.
   * @param {string[]} recordIds A list of register record IDs.
   * @param {object} [options] Additional options.
   * @param {boolean} [options.returnRecords] Return records instead of IDs.
   * @param {number} [options.concurrent] Number of concurrent requests.
   * @param {number} [options.interval] Interval between requests.
   * @param {object} [meta] Metadata for logging.
   * @param {string} meta.registerId Register ID.
   * @param {string} meta.keyId Key ID.
   * @param {object} eventContext Event context.
   */
  async getRecordsToDelete(recordIds, options = {}, meta = {}, eventContext = {}) {
    const returnRecords = options.returnRecords || false;
    const concurrent = options.concurrent || 500;
    const interval = options.interval || 1000;

    // Create a queue to handle mass register requests.
    const queue = new Queue({ concurrent, interval });

    // Log queue events.
    queue.on('start', () => global.log.save('delete-registers-queue|start', meta));
    queue.on('stop', () => global.log.save('delete-registers-queue|stop', meta));
    queue.on('end', () => global.log.save('delete-registers-queue|end', meta));

    // Raise a flag if the queue fails at least one time.
    let isFailed = false;
    queue.on('reject', (error) => {
      isFailed = true;
      global.log.save('delete-registers-queue|reject', { ...meta, error: error.toString() }, 'error');
    });

    // Enqueue jobs to fetch record data.
    for (const recordId of recordIds) {
      queue.enqueue(() =>
        this.handleRequestEvent({
          data: { registerId: meta.registerId, keyId: meta.keyId, recordId },
          type: 'registers',
          crudType: CRUD_TYPE.GET,
          eventContext,
        }),
      );
    }

    // Dequeue jobs and collect records to delete.
    const recordsToDelete = [];
    while (queue.shouldRun && !isFailed) {
      const rows = await queue.dequeue();

      // Iterate over the batch of concurrently executed requests.
      for (const row of rows) {
        // Push record to delete list (if record body requested and present).
        if (row?.[0]) {
          recordsToDelete.push(returnRecords ? row[0] : 1);
        }
      }
    }

    return recordsToDelete;
  }
}

module.exports = EventBusiness;
