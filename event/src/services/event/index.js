const EventNotifier = require('./notifier');
const EventDelayer = require('./delayer');
const EventRequester = require('./requester');
const EventStopper = require('./stopper');
const EventUnit = require('./unit');
const EventUser = require('./user');
const EventWorkflow = require('./workflow');
const EventCleaner = require('./cleaner');
const EventFile = require('./file');
const { CRUD_TYPE } = require('../../constants/http');
const { ERROR_WRONG_METHOD } = require('../../constants/error');

/**
 * Event service.
 * @typedef {import('./stopper/stop_result')} StopResult Stop result.
 */
class EventService {
  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} config.notifier Notifier config.
   * @param {object} config.delayer Delayer config.
   * @param {object} config.requester Requester config.
   * @param {object} config.stopper Stopper config.
   * @param {{unitModel}} config.user User config.
   */
  constructor(config) {
    // Define singleton.
    if (!EventService.singleton) {
      // Init events.
      this.eventNotifier = new EventNotifier(config.notifier);
      this.eventDelayer = new EventDelayer(config.delayer);
      this.eventRequester = new EventRequester(config.requester);
      this.eventStopper = new EventStopper(config.stopper);
      this.eventUnit = new EventUnit(config);
      this.eventUser = new EventUser(config.user);
      this.eventWorkflow = new EventWorkflow(config);
      this.eventCleaner = new EventCleaner({ filestorage: config.filestorage });
      this.eventFile = new EventFile();

      // Init singleton.
      EventService.singleton = this;
    }

    // Return singleton.
    return EventService.singleton;
  }

  /**
   * Notify.
   */
  async notify(method, ...options) {
    switch (method) {
      case 'email':
        return await this.eventNotifier.sendEmail(...options);
      case 'sms':
        return await this.eventNotifier.sendSms(...options);
      case 'digest':
        return await this.eventNotifier.sendToDigest(...options);
      case 'hideImportantMessages':
        return await this.eventNotifier.hideImportantMessages(...options);
      default:
        throw new Error(ERROR_WRONG_METHOD);
    }
  }

  /**
   * Delay.
   * @param {string} time Time.
   * @returns {string}
   */
  async delay(time) {
    return await this.eventDelayer.delay(time);
  }

  /**
   * Request.
   * @param {object} params Params.
   * @param {any} params.id ID.
   * @param {object} params.data Data.
   * @param {'blockchain'|'registers'|'registerKeys'|'externalService'} params.type Requester type.
   * @param {'get'|'create'|'update'|'delete'} params.crudType CRUD type.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} params.eventContext Event context.
   * @returns {Promise<object>} Request result promise.
   * @throws {Error}
   */
  async request({ id, data, type, crudType = CRUD_TYPE.CREATE, eventContext = {} }) {
    switch (crudType) {
      case CRUD_TYPE.GET:
        return await this.eventRequester.get(data, type, eventContext);
      case CRUD_TYPE.CREATE:
        return await this.eventRequester.create(data, type, eventContext);
      case CRUD_TYPE.UPDATE:
        return await this.eventRequester.update(id, data, type, eventContext);
      case CRUD_TYPE.DELETE:
        return await this.eventRequester.delete(id, type, eventContext);
      default:
        throw new Error('Wrong CRUD type.');
    }
  }

  /**
   * Stop.
   * @param {string} workflowId Workflow ID.
   * @param {string} eventTemplateId Event template ID.
   * @param {TaskModel} taskModel Task model.
   * @param {DocumentModel} documentModel Document model.
   * @param {EventModel} eventModel Event model.
   * @param {string[]} taskTemplateIdsFilter Task template IDs filter.
   * @param {string[]} eventTemplateIdsFilter Event template IDs filter.
   * @returns {StopResult} Stop result.
   */
  async stop(workflowId, eventTemplateId, taskModel, documentModel, eventModel, taskTemplateIdsFilter, eventTemplateIdsFilter) {
    return await this.eventStopper.stop(
      workflowId,
      eventTemplateId,
      taskModel,
      documentModel,
      eventModel,
      taskTemplateIdsFilter,
      eventTemplateIdsFilter,
    );
  }

  /**
   * Unit.
   * @param {{unitData, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate}} data Data.
   * @param {'create', 'update'} type Type.
   */
  async unit(data, type) {
    // Define params.
    const { unitData, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate, removeFromBaseUnits } = data;

    switch (type) {
      case 'create':
        return await this.eventUnit.create({ unitData, unitModel, accessHistoryModel, workflowId, eventTemplate });
      case 'update':
        return await this.eventUnit.update({ unitData, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate, removeFromBaseUnits });
      default:
        throw new Error(ERROR_WRONG_METHOD);
    }
  }

  /**
   * User.
   * @param {{unitId, userId, userIdList, unitModel, accessHistoryModel, taskModel}} data Data.
   * @param {'addMembersToUnitsIpn'|'removeMembersFromUnitsIpn'|'removeMembersFromUnitsByIpn'|'addMember'|'addRequestedMember'|'addHead'|'addHeadIpn'|'addHeadIpnList'|'addMemberIpn'|'addMemberIpnList'|'removeMember'|'removeMemberList'|'removeHead'|'removeHeadList'|'removeMemberIpn'|'removeMemberIpnList'|'removeHeadIpn'|'removeHeadIpnList'|'updateUser'|'searchUser'} type Type.
   */
  async user(data, type) {
    // Define params.
    const {
      unitId,
      unitIdList,
      userId,
      userIdList,
      ipn,
      ipnList,
      unitModel,
      accessHistoryModel,
      taskModel,
      userData,
      searchData,
      workflowId,
      eventTemplate,
      userName,
      initUserName,
      initUserId,
    } = data;

    // Call event user method accordance to type.
    switch (type) {
      case 'addMember':
        return await this.eventUser.addMember({
          unitId,
          userId,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addMemberList':
        return await this.eventUser.addMemberList({
          unitId,
          userIdList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addRequestedMember':
        return await this.eventUser.addRequestedMember({
          unitId,
          unitModel,
          ipn,
          userName,
        });
      case 'addMemberIpnList':
        return await this.eventUser.addMemberIpnList({
          unitId,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addHead':
        return await this.eventUser.addHead({
          unitId,
          userId,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addHeadList':
        return await this.eventUser.addHeadList({
          unitId,
          userIdList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addHeadIpn':
        return await this.eventUser.addHeadIpn({
          unitId,
          ipn,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addHeadIpnList':
        return await this.eventUser.addHeadIpnList({
          unitId,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'addMemberIpn':
        return await this.eventUser.addMemberIpn({
          unitId,
          ipn,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMember':
        return await this.eventUser.removeMember({
          unitId,
          userId,
          unitModel,
          accessHistoryModel,
          taskModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMemberList':
        return await this.eventUser.removeMemberList({
          unitId,
          userIdList,
          unitModel,
          accessHistoryModel,
          taskModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeHead':
        return await this.eventUser.removeHead({
          unitId,
          userId,
          unitModel,
          accessHistoryModel,
          taskModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeHeadList':
        return await this.eventUser.removeHeadList({
          unitId,
          userIdList,
          unitModel,
          accessHistoryModel,
          taskModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMemberIpn':
        return await this.eventUser.removeMemberIpn({
          unitId,
          ipn,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMemberIpnList':
        return await this.eventUser.removeMemberIpnList({
          unitId,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeHeadIpn':
        return await this.eventUser.removeHeadIpn({
          unitId,
          ipn,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeHeadIpnList':
        return await this.eventUser.removeHeadIpnList({
          unitId,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'updateUser':
        return await this.eventUser.updateUser(userId, userData, workflowId, eventTemplate);
      case 'searchUser':
        return await this.eventUser.searchUser(searchData, unitModel);
      case 'addMembersToUnitsIpn':
        return await this.eventUser.addMembersToUnitsIpn({
          unitIdList,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMembersFromUnitsIpn':
        return await this.eventUser.removeMembersFromUnitsIpn({
          unitIdList,
          ipnList,
          unitModel,
          accessHistoryModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      case 'removeMembersFromUnitsByIpn':
        return await this.eventUser.removeMembersFromUnitsByIpn({
          unitIdList,
          ipnList,
          unitModel,
          accessHistoryModel,
          taskModel,
          workflowId,
          eventTemplate,
          userName,
          initUserName,
          initUserId,
        });
      default:
        throw new Error(ERROR_WRONG_METHOD);
    }
  }

  /**
   * Workflow.
   * @param {{workflowParentId: string, createWorkflows: object[], createWorkflowsExternal: object[], sendStatusExternal: object, sendStatus: object, jsonSchemaObject: object}} data Data.
   * @returns {Promise<boolean>}
   */
  async workflow({
    workflowParentId,
    createWorkflows,
    createWorkflowsExternal,
    sendStatusExternal,
    sendStatus,
    taskIds,
    newPerformerUsers,
    newPerformerUserNames,
    fromPerformerUsers,
    jsonSchemaObject,
  }) {
    // Create workflows.
    if (createWorkflows) {
      return await this.eventWorkflow.createWorkflows({ workflowParentId, createWorkflows });
    }

    // Create workflows external.
    if (createWorkflowsExternal) {
      return await this.eventWorkflow.createWorkflowsExternal({ createWorkflowsExternal, jsonSchemaObject });
    }

    // Send status external.
    if (sendStatusExternal) {
      return await this.eventWorkflow.sendStatusExternal({ sendStatusExternal, jsonSchemaObject });
    }

    // Send status.
    if (sendStatus) {
      return await this.eventWorkflow.sendStatus({ sendStatus, jsonSchemaObject });
    }

    // Set new tasks performers.
    if (newPerformerUsers) {
      return await this.eventWorkflow.setNewTasksPerformers({
        taskIds,
        newPerformerUsers,
        newPerformerUserNames,
        fromPerformerUsers,
        jsonSchemaObject,
      });
    }
  }

  /**
   * Clear.
   * @param {{workflowId: string, eventTemplateId: number, documents: object[], events: object[], jsonSchemaObject: object}} data Data.
   */
  async clear({ workflowId, eventTemplateId, documents, events, jsonSchemaObject }) {
    return await this.eventCleaner.clear({
      workflowId,
      eventTemplateId,
      documents,
      events,
      jsonSchemaObject,
    });
  }

  /**
   * File.
   * @param {object} eventContext Event context.
   */
  async file(eventContext) {
    return await this.eventFile.execute(eventContext);
  }
}

module.exports = EventService;
