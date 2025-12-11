const _ = require('lodash');
const Sandbox = require('./sandbox');
const { InvalidSchemaError } = require('./errors');

// Constants.
const REASSIGN_TRIGGER_ERROR = 'reassignTrigger error.';

/**
 * Assigner.
 * @typedef {import('../entities/workflow')} WorkflowEntity
 * @typedef {import('../entities/document')} DocumentEntity
 * @typedef {import('../entities/event')} EventEntity
 * @typedef {import('../models/task')} TaskModel
 * @typedef {import('../models/unit')} UnitModel
 */
class Assigner {
  /**
   * Assigner constructor.
   * @param {TaskModel} taskModel Models.
   * @param {UnitModel} unitModel Unit model.
   */
  constructor(taskModel, unitModel) {
    // Singleton.
    if (!Assigner.singleton) {
      // Set params.
      this.taskModel = taskModel;
      this.unitModel = unitModel;
      this.sandbox = new Sandbox();

      // Init singleton.
      Assigner.singleton = this;
    }

    // Return singleton.
    return Assigner.singleton;
  }

  /**
   * Calc performer users.
   * @param {WorkflowEntity} workflow Workflow.
   * @param {DocumentEntity[]} documents Documents from current workflow.
   * @param {EventEntity[]} events Events from current workflow.
   * @param {{performerUsersIsWorkflowOwner, performerUsersIsRandomFromUnit, performerUsersIsRandomHeadFromUnit, performerUsersIsRandomMemberFromUnit, performerUsersIsOptimalMemberFromUnit}} permissionDescription Permission description.
   * @param {Array<number>} currentTaskPerformerUnitIds Task performer unit ids.
   * @param {TaskEntity.meta} meta Task meta.
   * @param {TaskEntity.activityLog} taskActivityLog Task activity log.
   * @returns {Promise<{ids: string[], ipns: string[]}>} Calculated performer users (ID and IPN) promise.
   */
  async calcPerformerUsers(
    workflow,
    documents,
    events,
    permissionDescription,
    currentTaskPerformerUnitIds,
    meta,
    taskActivityLog
  ) {
    // Calculated performer users container.
    let performerUsers = [];
    let performerUsersIpn = [];
    let performerUsersEmail = [];
    let performerUsersName = [];

    // Parse permission description.
    const {
      calcPerformerUsers: calcPerformerUsersFunction,
      calcPerformerUsersIpn: calcPerformerUsersIpnFunction,
      calcPerformerUsersEmail: calcPerformerUsersEmailFunction,
      calcPerformerUsersName: calcPerformerUsersNameFunction,
      performerUsersIsWorkflowOwner,
      performerUsersIsRandomFromUnit,
      performerUsersIsRandomHeadFromUnit,
      performerUsersIsRandomMemberFromUnit,
      performerUsersIsOptimalMemberFromUnit,
      reassignTrigger
    } = permissionDescription;

    // Use only reassign trigger if they defined.
    if (reassignTrigger?.calcPerformerUsers) {
      try {
        const userIdOrIds = this.sandbox.evalWithArgs(
          reassignTrigger.calcPerformerUsers,
          [{
            documents,
            optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
            currentTaskPerformerUnitIds,
            meta: meta,
            taskActivityLog: _.cloneDeep(taskActivityLog)
          }],
          { meta: { fn: 'calcPerformerUsers.calcPerformerUsers', workflowId: workflow.id } },
        );

        if (typeof userIdOrIds === 'undefined' || userIdOrIds === null) {
          throw new InvalidSchemaError('reassignTrigger performer users cannot be undefined or null.');
        }
        const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
        performerUsers.push(...userIds);
      } catch (error) {
        log.save('task-permission-reassign-trigger-calc-users-error', { error: error && error.message, workflowId: workflow.id, permissionDescription, meta });
        error.cause = REASSIGN_TRIGGER_ERROR;
        throw error;
      }

      // Normalize calculated performer users.
      const definedPerformerUsers = performerUsers.filter(v => !!v);
      const normalizedPerformerUsers = [...new Set(definedPerformerUsers)];

      // Return calculated performer users (ID and IPN and Names lists).
      return { ids: normalizedPerformerUsers, ipns: [], names: [] };
    }

    // Calc performer users.
    if (calcPerformerUsersFunction) {
      try {
        const userIdOrIds = this.sandbox.evalWithArgs(
          calcPerformerUsersFunction,
          [documents, events],
          { meta: { fn: 'calcPerformerUsers.calcPerformerUsers', workflowId: workflow.id } },
        );
        const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
        performerUsers.push(...userIds);
      } catch (error) {
        log.save('task-permission-calc-users-error', { error: error && error.message, workflowId: workflow.id, calcPerformerUsersFunction });
      }
    }

    // Calc performer users IPN.
    if (calcPerformerUsersIpnFunction) {
      try {
        const userIpnOrIpns = this.sandbox.evalWithArgs(
          calcPerformerUsersIpnFunction,
          [documents, events],
          { meta: { fn: 'calcPerformerUsers.calcPerformerUsersIpn', workflowId: workflow.id } },
        );
        const userIpns = Array.isArray(userIpnOrIpns) ? userIpnOrIpns : [userIpnOrIpns];
        performerUsersIpn.push(...userIpns);
      } catch (error) {
        log.save('task-permission-calc-users-ipn-error', { error: error && error.message, workflowId: workflow.id, calcPerformerUsersFunction });
      }
    }

    // Calc peformer users email.
    if (calcPerformerUsersEmailFunction) {
      try {
        const userEmailOrEmails = this.sandbox.evalWithArgs(calcPerformerUsersEmailFunction, [documents, events]);
        const userEmails = Array.isArray(userEmailOrEmails) ? userEmailOrEmails : [userEmailOrEmails];
        performerUsersEmail.push(...userEmails);
      } catch (error) {
        log.save('task-permission-calc-users-email-error', { error: error && error.message, workflowId: workflow.id, calcPerformerUsersFunction });
      }
    }

    // Calc performer users name.
    if (calcPerformerUsersNameFunction) {
      try {
        const userNameOrNames = this.sandbox.evalWithArgs(
          calcPerformerUsersNameFunction,
          [documents, events],
          { meta: { fn: 'calcPerformerUsers.calcPerformerUsersName', workflowId: workflow.id } },
        );
        const userNames = Array.isArray(userNameOrNames) ? userNameOrNames : [userNameOrNames];
        performerUsersName.push(...userNames);
      } catch (error) {
        log.save('task-permission-calc-users-ipn-error', { error: error && error.message, workflowId: workflow.id, calcPerformerUsersFunction });
      }
    }

    // Calc workflow owner.
    if (performerUsersIsWorkflowOwner) {
      const { createdBy: workflowCreatedBy } = workflow;
      performerUsers.push(workflowCreatedBy);
    }

    // Calc random user from unit.
    if (performerUsersIsRandomFromUnit) {
      const unitId = performerUsersIsRandomFromUnit;
      const unit = await this.unitModel.findById(unitId);
      const headsAndMembers = unit.getHeadsAndMembers();
      const randomUserPosition = this.getRandomInteger(0, headsAndMembers.length - 1);
      const randomUser = headsAndMembers[randomUserPosition];
      performerUsers.push(randomUser);
    }

    // Calc random head from unit.
    if (performerUsersIsRandomHeadFromUnit) {
      const unitId = typeof performerUsersIsRandomHeadFromUnit === 'string' && this.sandbox.evalWithArgs(
        performerUsersIsRandomHeadFromUnit,
        [documents, events],
        { checkArrow: true, meta: { fn: 'calcPerformerUsers.performerUsersIsRandomHeadFromUnit', workflowId: workflow.id } },
      );
      const unit = await this.unitModel.findById(unitId);
      if (unitId && unit) {
        const { heads } = unit;
        const randomUserPosition = this.getRandomInteger(0, heads.length - 1);
        const randomUser = heads[randomUserPosition];
        performerUsers.push(randomUser);
      }
    }

    // Calc random member from unit.
    if (performerUsersIsRandomMemberFromUnit) {
      const unitId = typeof performerUsersIsRandomMemberFromUnit === 'string' && this.sandbox.evalWithArgs(
        performerUsersIsRandomMemberFromUnit,
        [documents, events],
        { checkArrow: true, meta: { fn: 'calcPerformerUsers.performerUsersIsRandomMemberFromUnit', workflowId: workflow.id } },
      );
      const unit = await this.unitModel.findById(unitId);
      if (unitId && unit) {
        const { members } = unit;
        const randomUserPosition = this.getRandomInteger(0, members.length - 1);
        const randomUser = members[randomUserPosition];
        performerUsers.push(randomUser);
      }
    }

    // Calc optimal member from unit.
    if (performerUsersIsOptimalMemberFromUnit) {
      const unitId = performerUsersIsOptimalMemberFromUnit;
      const unit = await this.unitModel.findById(unitId);
      const { members } = unit;
      if (members.length > 0) {
        let optimalUserId;
        let optimalUserTasksCount;
        let userTasksInfoToLog = [];
        for (const member of members) {
          const memberTasksCount = await this.taskModel.getNotFinishedCountByPerformerUser(member);
          userTasksInfoToLog.push({ member, memberTasksCount });
          if (typeof optimalUserTasksCount === 'undefined' || memberTasksCount < optimalUserTasksCount) {
            optimalUserId = member;
            optimalUserTasksCount = memberTasksCount;
          }
        }
        log.save('optimal-assign', { workflowId: workflow.id, optimalUserId, optimalUserTasksCount, userTasksInfoToLog });
        performerUsers.push(optimalUserId);
      }
    }

    // Normalize calculated performer users.
    const definedPerformerUsers = performerUsers.filter(v => !!v);
    const normalizedPerformerUsers = [...new Set(definedPerformerUsers)];

    // Normalize calculated performer users IPN.
    const definedPerformerUsersIpn = performerUsersIpn.filter(v => !!v);
    const normalizedPerformerUsersIpn = [...new Set(definedPerformerUsersIpn)];

    // Normalize calculated performer users email.
    const definedPerformerUsersEmail = performerUsersEmail.filter(v => !!v);
    const normalizedPerformerUsersEmail = [...new Set(definedPerformerUsersEmail)];

    // Normalize calculated performer users name.
    const definedPerformerUsersName = performerUsersName.filter(v => !!v);
    const normalizedPerformerUsersName = [...new Set(definedPerformerUsersName)];

    // Return calculated performer users (ID and IPN and Names lists).
    return {
      ids: normalizedPerformerUsers,
      ipns: normalizedPerformerUsersIpn,
      names: normalizedPerformerUsersName,
      emails: normalizedPerformerUsersEmail,
    };
  }

  /**
   * Calc performer units.
   * @param {WorkflowEntity} workflow Workflow.
   * @param {DocumentEntity[]} documents Documents from current workflow.
   * @param {{calcPerformerUnits}} permissionDescription Permission description.
   * @param {string} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units info.
   * @param {EventEntity[]} events Events from current workflow.
   * @param {Array<number>} currentTaskPerformerUnitIds Task performer unit ids.
   * @param {TaskEntity.meta} meta Task meta.
   * @param {TaskEntity.activityLog} taskActivityLog Task activity log.
   * @returns {string[]} Calculated performer users.
   */
  async calcPerformerUnits(
    workflow,
    documents,
    permissionDescription,
    user,
    units,
    events,
    currentTaskPerformerUnitIds,
    meta,
    taskActivityLog
  ) {
    // Calculated performer users container.
    let performerUnits = [];

    // Parse permission description.
    const { calcPerformerUnits: calcPerformerUnitsFunction, reassignTrigger } = permissionDescription;

    // Use only reassign trigger if they defined.
    if (reassignTrigger?.calcPerformerUnits) {
      try {
        const unitIdOrIds = this.sandbox.evalWithArgs(
          reassignTrigger?.calcPerformerUnits,
          [{
            documents,
            optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
            currentTaskPerformerUnitIds,
            meta: meta,
            taskActivityLog: _.cloneDeep(taskActivityLog)
          }],
          { meta: { fn: 'calcPerformerUnits.reassignTrigger.calcPerformerUnits', workflowId: workflow.id } },
        );

        if (typeof unitIdOrIds === 'undefined' || unitIdOrIds === null) {
          throw new InvalidSchemaError('reassignTrigger performer units cannot be undefined or null.');
        }
        const unitIds = Array.isArray(unitIdOrIds) ? unitIdOrIds : [unitIdOrIds];
        performerUnits.push(...unitIds);
      } catch (error) {
        log.save('task-permission-reassign-trigger-calc-units-error', { error: error.toString(), workflowId: workflow.id, permissionDescription, meta });
        error.cause = REASSIGN_TRIGGER_ERROR;
        throw error;
      }

      // Normalize and return calculated performer units.
      const definedPerformerUnits = performerUnits.filter(v => !!v);
      const normalizedPerformerUnits = [...new Set(definedPerformerUnits)];
      return normalizedPerformerUnits;
    }

    // Calc performer units.
    if (calcPerformerUnitsFunction) {
      try {
        const unitIdOrIds = this.sandbox.evalWithArgs(
          calcPerformerUnitsFunction,
          [documents, user, units, events],
          { meta: { fn: 'calcPerformerUnits.calcPerformerUnits', workflowId: workflow.id } },
        );
        const unitIds = Array.isArray(unitIdOrIds) ? unitIdOrIds : [unitIdOrIds];
        performerUnits.push(...unitIds);
      } catch (error) {
        log.save('task-permission-calc-units-error', { error: error && error.message, workflowId: workflow.id, calcPerformerUnitsFunction });
      }
    }

    // Normalize and return calculated performer units.
    const definedPerformerUnits = performerUnits.filter(v => !!v);
    const normalizedPerformerUnits = [...new Set(definedPerformerUnits)];
    return normalizedPerformerUnits;
  }

  /**
   * Calc required performer units.
   * @param {WorkflowEntity} workflow Workflow.
   * @param {DocumentEntity[]} documents Documents from current workflow.
   * @param {{calcRequiredPerformerUnits}} calcRequiredPerformerUnits Calc required performer units.
   * @param {string} user User info.
   * @param {{all: UnitEntity[], head: UnitEntity[], member: UnitEntity[]}} units User units info.
   * @param {EventEntity[]} events Events from current workflow.
   * @param {Array<number>} currentTaskPerformerUnitIds Task performer unit ids.
   * @param {TaskEntity.meta} meta Task meta.
   * @param {TaskEntity.activityLog} taskActivityLog Task activity log.
   * @returns {string[]} Calculated performer users.
   */
  async calcRequiredPerformerUnits(
    workflow,
    documents,
    permissionDescription,
    user,
    units,
    events,
    currentTaskPerformerUnitIds,
    meta,
    taskActivityLog
  ) {
    // Calculated performer users container.
    let requiredPerformerUnits = [];

    // Parse permission description.
    const { calcRequiredPerformerUnits: calcRequiredPerformerUnitsFunction, reassignTrigger } = permissionDescription;

    // Use only reassign trigger if they defined.
    if (reassignTrigger?.calcRequiredPerformerUnits) {
      try {
        const unitIdOrIds = this.sandbox.evalWithArgs(
          reassignTrigger?.calcRequiredPerformerUnits,
          [{
            documents,
            optionalProjectParams: global.config?.custom?.optionalProjectParams || {},
            currentTaskPerformerUnitIds,
            meta: meta,
            taskActivityLog: _.cloneDeep(taskActivityLog)
          }],
          { meta: { fn: 'calcRequiredPerformerUnits.reassignTrigger.calcRequiredPerformerUnits', workflowId: workflow.id } },
        );

        if (typeof unitIdOrIds === 'undefined' || unitIdOrIds === null) {
          throw new InvalidSchemaError('reassignTrigger performer units cannot be undefined or null.');
        }
        const unitIds = Array.isArray(unitIdOrIds) ? unitIdOrIds : [unitIdOrIds];
        requiredPerformerUnits.push(...unitIds);
      } catch (error) {
        log.save('task-permission-reassign-trigger-calc-units-error', { error: error.toString(), workflowId: workflow.id, permissionDescription, meta });
        error.cause = REASSIGN_TRIGGER_ERROR;
        throw error;
      }

      // Normalize and return calculated performer units.
      const definedRequiredPerformerUnits = requiredPerformerUnits.filter(v => !!v);
      const normalizedRequiredPerformerUnits = [...new Set(definedRequiredPerformerUnits)];
      return normalizedRequiredPerformerUnits;
    }

    // Calc performer units.
    if (calcRequiredPerformerUnitsFunction) {
      try {
        const unitIdOrIds = this.sandbox.evalWithArgs(
          calcRequiredPerformerUnitsFunction,
          [documents, user, units, events],
          { meta: { fn: 'calcRequiredPerformerUnits.calcRequiredPerformerUnits', workflowId: workflow.id } },
        );
        const unitIds = Array.isArray(unitIdOrIds) ? unitIdOrIds : [unitIdOrIds];
        requiredPerformerUnits.push(...unitIds);
      } catch (error) {
        log.save('task-permission-calc-units-error', { error: error && error.message, workflowId: workflow.id, calcRequiredPerformerUnitsFunction });
      }
    }

    // Normalize and return calculated performer units.
    const definedRequiredPerformerUnits = requiredPerformerUnits.filter(v => !!v);
    const normalizedRequiredPerformerUnits = [...new Set(definedRequiredPerformerUnits)];
    return normalizedRequiredPerformerUnits;
  }

  /**
   * Get random integer.
   * @param {number} min Min number.
   * @param {number} max Max number.
   */
  getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

}

module.exports = Assigner;
