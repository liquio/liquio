const _ = require('lodash');

const HttpRequest = require('../../../lib/http_request');
const { getTraceId } = require('../../../lib/async_local_storage');
const UserResult = require('./user_result');
const UnitRulesModel = require('../../../models/unit_rules');
const typeOf = require('../../../lib/type_of');

// Constants.
const DEFAULT_ROUTES = {
  updateUser: '/user/info',
  getUserInfoById: '/user/info/id',
  searchUsers: '/user/info/search',
  getUserByCode: '/user/info/ipn',
  getUserByEdrpou: '/user/info/edrpou',
};

/**
 * Event user.
 * @typedef {import('../../../models/unit')} UnitModel Unit model.
 * @typedef {import('../../../models/access_history')} AccessHistoryModel Access history model.
 * @typedef {import('../../../models/task')} TaskModel Task model.
 */
class EventUser {
  /**
   * Event user constructor.
   * @param {object} config Event user config.
   */
  constructor(config) {
    // Define singleton.
    if (!EventUser.singleton) {
      // Save params.
      this.config = config;

      this.server = config.LiquioId.server;
      this.port = config.LiquioId.port;
      this.routes = { ...DEFAULT_ROUTES };
      this.timeout = config.LiquioId.timeout;
      this.clientId = config.LiquioId.clientId;
      this.clientSecret = config.LiquioId.clientSecret;
      this.basicAuthHeader = `Basic ${config.LiquioId.basicAuthToken}`; // Header "Authorization".
      this.searchUsersLimit = config.searchUsersLimit || 10;
      this.unitRulesModel = new UnitRulesModel();

      // Set singleton.
      EventUser.singleton = this;
    }

    // Return singleton.
    return EventUser.singleton;
  }

  async addMemberList({ unitId, userIdList, ...rest }) {
    if (!Array.isArray(userIdList) || !userIdList.length) {
      return new UserResult({
        operation: 'addMemberList',
        unitId,
        userIdList,
        error: 'User id list is not valid.',
      });
    }

    const result = await Promise.all(userIdList.map((userId) => this.addMember({ unitId, userId, ...rest })));

    return new UserResult({
      operation: 'addMemberList',
      unitId,
      unit: result[0].unit,
      userIdList,
      result: result.map((userResult) => _.omit(userResult, ['unit', 'unitId'])),
    });
  }

  /**
   * Add member.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.userId User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Unit model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addMember({ unitId, userId, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Check user already exist in needed unit as member.
    const isUserAlreadyUnitMember = await this.isUserAlreadyInUnit(unitId, userId, unitModel, 'member');
    if (isUserAlreadyUnitMember) {
      // Create and return result.
      const userResult = new UserResult({
        operation: 'addMember',
        unitId,
        userId,
        error: 'User already unit member.',
      });
      return userResult;
    }

    const user = { userId, ...(userName && { name: userName }) };
    const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

    // Add member.
    let unit;
    let exceptionMessage;
    try {
      // Check unit exclusive rules.
      await this.checkUserUnitsExclusiveRules(unitId, userId, unitModel);

      unit = await unitModel.addMember(unitId, userId);

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'added-to-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-add-member-error', { error: exceptionMessage });
      throw error;
    }

    // Add member to base units.
    const { basedOn = [] } = unit || {};
    for (const baseUnitId of basedOn) {
      try {
        await unitModel.addMember(baseUnitId, userId);

        // Save to access history.
        const baseUnit = await unitModel.findById(baseUnitId);
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user,
          currentUser,
          unit: baseUnit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-user-add-member-to-base-error', { error: error && error.message });
        throw error;
      }
    }

    // Log user's units.
    log.save('user-added-to-unit-members', { unitId, userId, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'addMember',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  async addRequestedMember({ unitId, ipn, userName, unitModel }) {
    // Check user already exist in needed unit as requested member.
    const isUserAlreadyInUnitAsRequestedMember = await this.checkIsUserAlreadyInUnitAsRequestedMember(unitId, ipn, unitModel, 'requestedMember');

    if (isUserAlreadyInUnitAsRequestedMember) {
      return new UserResult({
        operation: 'addRequestedMember',
        unitId,
        ipn,
        error: 'User already unit requested member.',
      });
    }

    if (!userName || typeof userName !== 'string') {
      return new UserResult({
        operation: 'addRequestedMember',
        unitId,
        ipn,
        error: 'User name is not valid.',
      });
    }

    // Add member.
    let unit;
    let exceptionMessage;
    try {
      const nameParts = userName.split(' ').filter(Boolean);
      const firstName = nameParts.shift();
      const lastName = nameParts.pop();
      const middleName = nameParts.join(' ');

      unit = await unitModel.addRequestedMember(unitId, {
        ipn,
        firstName,
        lastName,
        ...(middleName ? { middleName } : {}),
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-add-requested-member-error', { error: exceptionMessage });
      throw error;
    }

    // Create and return result.
    return new UserResult({
      operation: 'addRequestedMember',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
  }

  async addHeadList({ unitId, userIdList, ...rest }) {
    if (!Array.isArray(userIdList) || !userIdList.length) {
      return new UserResult({
        operation: 'addHeadList',
        unitId,
        userIdList,
        error: 'User id list is not valid.',
      });
    }

    const result = await Promise.all(userIdList.map((userId) => this.addHead({ unitId, userId, ...rest })));

    return new UserResult({
      operation: 'addHeadList',
      unitId,
      unit: result[0].unit,
      userIdList,
      result: result.map((userResult) => _.omit(userResult, ['unit', 'unitId'])),
    });
  }

  /**
   * Add head.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.userId User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addHead({ unitId, userId, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Check user already exist in needed unit as member.
    const isUserAlreadyUnitHead = await this.isUserAlreadyInUnit(unitId, userId, unitModel, 'head');
    if (isUserAlreadyUnitHead) {
      // Create and return result.
      const userResult = new UserResult({
        operation: 'addMember',
        unitId,
        userId,
        error: 'User already unit head.',
      });
      return userResult;
    }

    const user = { userId, ...(userName && { name: userName }) };
    const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

    // Add head.
    let unit;
    let exceptionMessage;
    try {
      // Check unit exclusive rules.
      await this.checkUserUnitsExclusiveRules(unitId, userId, unitModel);

      unit = await unitModel.addHead(unitId, userId);

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'added-to-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-add-head-error', { error: exceptionMessage });
      throw error;
    }

    // Add head to base units.
    const { basedOn = [] } = unit || {};
    for (const baseUnitId of basedOn) {
      try {
        await unitModel.addHead(baseUnitId, userId);

        // Save to access history.
        const baseUnit = await unitModel.findById(baseUnitId);
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user,
          currentUser,
          unit: baseUnit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-user-add-head-to-base-error', { error: error && error.message });
        throw error;
      }
    }

    // Log user's units.
    log.save('user-added-to-unit-heads', { unitId, userId, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'addHead',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Add member ipn.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.ipn Ipn.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addMemberIpn({ unitId, ipn, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Check user already exist in needed unit as member.
    const isIpnAlreadyUnitHead = await this.isIpnAlreadyInUnit(unitId, ipn, unitModel, 'member');
    if (isIpnAlreadyUnitHead) {
      // Create and return result.
      const userResult = new UserResult({
        operation: 'addMemberIpn',
        unitId,
        ipn,
        error: 'Ipn already unit member ipn.',
      });
      return userResult;
    }

    const user = { ipn, ...(userName && { name: userName }) };
    const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

    // Add member.
    let unit;
    let exceptionMessage;
    try {
      // Check unit exclusive rules.
      await this.checkUserUnitsExclusiveRules(unitId, undefined, unitModel, ipn);

      unit = await unitModel.addMemberIpn(unitId, ipn);

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'added-to-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-ipn-add-member-error', { error: exceptionMessage });
      throw error;
    }

    // Add member to base units.
    const { basedOn = [] } = unit || {};
    for (const baseUnitId of basedOn) {
      try {
        await unitModel.addMemberIpn(baseUnitId, ipn);

        // Save to access history.
        const baseUnit = await unitModel.findById(baseUnitId);
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user,
          currentUser,
          unit: baseUnit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-ipn-add-member-to-base-error', { error: error && error.message });
        throw error;
      }
    }

    // Log user's units.
    log.save('user-added-to-unit-member-ipns', { unitId, ipn, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'addMemberIpn',
      unitId,
      unit,
      ipn,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Add member ipn.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.ipn Ipn.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addMemberIpnList({ unitId, ipnList, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Check that all member ipn list already in unit.
    ipnList = ipnList.map((v) => (typeOf(v) === 'number' ? `${v}` : v));
    ipnList = [...new Set(ipnList)];
    const currentUnitMemberIpnList = await this.getCurrentUnitIpnList(unitId, ipnList, unitModel, 'member');
    const ipnListAlreadyInUnit = ipnList.filter((v) => currentUnitMemberIpnList.includes(v));
    if (ipnListAlreadyInUnit.length === ipnList.length) {
      // Create and return result.
      const userResult = new UserResult({
        operation: 'addMemberIpnList',
        unitId,
        ipn: ipnList.join(','),
        error: 'Ipn list already unit member ipn.',
      });
      return userResult;
    }

    const newIpnListToAdd = ipnList.filter((v) => !currentUnitMemberIpnList.includes(v));

    const user = { ipn: newIpnListToAdd.join(','), ...(userName && { name: userName }) };
    const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

    // Add member.
    let unit;
    let exceptionMessage;
    try {
      // Check unit exclusive rules.
      for (const newIpn of newIpnListToAdd) {
        await this.checkUserUnitsExclusiveRules(unitId, undefined, unitModel, newIpn);
      }

      unit = await unitModel.addMemberIpnList(unitId, newIpnListToAdd);

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'added-to-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-ipn-add-member-error', { error: exceptionMessage });
      throw error;
    }

    // Add member to base units.
    const { basedOn = [] } = unit || {};
    for (const baseUnitId of basedOn) {
      try {
        await unitModel.addMemberIpnList(baseUnitId, newIpnListToAdd);

        // Save to access history.
        const baseUnit = await unitModel.findById(baseUnitId);
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user,
          currentUser,
          unit: baseUnit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-ipn-add-member-to-base-error', { error: error && error.message });
        throw error;
      }
    }

    // Log user's units.
    log.save('user-added-to-unit-member-ipns', {
      unitId,
      ipn: newIpnListToAdd.join(','),
      workflowId,
      eventTemplate,
      userName,
      initUserName,
      initUserId,
    });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'addMemberIpn',
      unitId,
      unit,
      ipn: newIpnListToAdd.join(','),
      error: exceptionMessage,
    });
    return userResult;
  }

  async addHeadIpnList({ ipnList, unitId, ...rest }) {
    if (!Array.isArray(ipnList) || !ipnList.length) {
      return new UserResult({
        operation: 'addHeadIpnList',
        unitId,
        ipnList,
        error: 'Ipn list is not valid.',
      });
    }

    const result = await Promise.all(ipnList.map((ipn) => this.addHeadIpn({ ...rest, unitId, ipn })));

    return new UserResult({
      operation: 'addHeadIpnList',
      unitId,
      unit: result[0].unit,
      ipnList,
      result: result.map((userResult) => _.omit(userResult, ['unit', 'unitId'])),
    });
  }

  /**
   * Add head ipn.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.ipn Ipn.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addHeadIpn({ unitId, ipn, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Check user already exist in needed unit as member.
    const isIpnAlreadyUnitHead = await this.isIpnAlreadyInUnit(unitId, ipn, unitModel, 'head');
    if (isIpnAlreadyUnitHead) {
      // Create and return result.
      const userResult = new UserResult({
        operation: 'addHeadIpn',
        unitId,
        ipn,
        error: 'Ipn already unit head ipn.',
      });
      return userResult;
    }

    const user = { ipn, ...(userName && { name: userName }) };
    const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

    // Add head.
    let unit;
    let exceptionMessage;
    try {
      // Check unit exclusive rules.
      await this.checkUserUnitsExclusiveRules(unitId, undefined, unitModel, ipn);

      unit = await unitModel.addHeadIpn(unitId, ipn);

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'added-to-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-ipn-add-head-error', { error: exceptionMessage });
      throw error;
    }

    // Add head to base units.
    const { basedOn = [] } = unit || {};
    for (const baseUnitId of basedOn) {
      try {
        await unitModel.addHeadIpn(baseUnitId, ipn);

        // Save to access history.
        const baseUnit = await unitModel.findById(baseUnitId);
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user,
          currentUser,
          unit: baseUnit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-ipn-add-head-to-base-error', { error: error && error.message });
        throw error;
      }
    }

    // Log user's units.
    log.save('user-added-to-unit-head-ipns', { unitId, ipn, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'addHeadIpn',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Is user already unit member.
   * @param {string} unitId Unit ID.
   * @param {string} userId User ID.
   * @param {UnitModel} unitModel Unit model.
   * @param {'member'|'head'} type Type (`member` or `head`).
   * @returns {Promise<boolean>} Is user already in unit indicator promise.
   */
  async isUserAlreadyInUnit(unitId, userId, unitModel, type) {
    // Check user already exist in needed unit as member.
    let unit;
    try {
      unit = await unitModel.findById(unitId);
    } catch (error) {
      log.save('event-user-add-member-or-head-check-existing-unit-error', {
        error: error && error.message,
        unitId,
        userId,
      });
    }
    const isUserAlreadyUnitMember = unit && unit.members && unit.members.includes(userId);
    const isUserAlreadyUnitHead = unit && unit.heads && unit.heads.includes(userId);

    // Return user already exist in unit with needed type.
    const isUserInUnitWithNeededType = type === 'member' ? isUserAlreadyUnitMember : isUserAlreadyUnitHead;
    return isUserInUnitWithNeededType;
  }

  /**
   * Check is user exists in units as requested member.
   * @param {string} unitId Unit ID.
   * @param {string} userId User ID.
   * @param {UnitModel} unitModel Unit model.
   */
  async checkIsUserAlreadyInUnitAsRequestedMember(unitId, ipn, unitModel) {
    try {
      const unit = await unitModel.findById(unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }

      return []
        .concat(unit.requestedMembers)
        .filter(Boolean)
        .some((requestedMember) => requestedMember.ipn === ipn);
    } catch (error) {
      log.save('event-user-add-member-or-head-check-existing-unit-error', {
        error: error && error.message,
        unitId,
        ipn,
      });
      throw error;
    }
  }

  /**
   * Is ipn already in unit.
   * @param {string} unitId Unit ID.
   * @param {string} ipn Ipn.
   * @param {UnitModel} unitModel Unit model.
   * @param {'member'|'head'} type Type (`member` or `head`).
   * @returns {Promise<boolean>} Is user already in unit indicator promise.
   */
  async isIpnAlreadyInUnit(unitId, ipn, unitModel, type) {
    // Check user already exist in needed unit as member.
    let unit;
    try {
      unit = await unitModel.findById(unitId);
    } catch (error) {
      log.save('event-user-add-ipn-member-or-head-check-existing-unit-error', {
        error: error && error.message,
        unitId,
        ipn,
      });
    }
    const isIpnAlreadyUnitMember = unit && unit.membersIpn && unit.membersIpn.includes(ipn);
    const isIpnAlreadyUnitHead = unit && unit.headsIpn && unit.headsIpn.includes(ipn);

    // Return user already exist in unit with needed type.
    const isUserInUnitWithNeededType = type === 'member' ? isIpnAlreadyUnitMember : isIpnAlreadyUnitHead;
    return isUserInUnitWithNeededType;
  }

  /**
   * @param {string} unitId Unit ID.
   * @param {string} ipnList Ipn list.
   * @param {UnitModel} unitModel Unit model.
   * @param {'member'|'head'} type Type (`member` or `head`).
   * @returns {Promise<Array>} Current unit ipn list.
   */
  async getCurrentUnitIpnList(unitId, ipnList, unitModel, type) {
    let unit;
    try {
      unit = await unitModel.findById(unitId);
    } catch (error) {
      log.save('event-user-get-unit-members-ipn-error', {
        error: error && error.message,
        unitId,
        ipn: ipnList.join(','),
      });
    }

    if (type === 'head') {
      return unit.headsIpn;
    }
    if (type === 'member') {
      return unit.membersIpn;
    }
  }

  /**
   * Remove member.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.userId User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {TaskModel} params.taskModel Task model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMember({ unitId, userId, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove member.
    let unit;
    let exceptionMessage;
    try {
      unit = await unitModel.removeMember(unitId, userId);

      // Remove performer user from tasks.
      await taskModel.removePerformerUserFromTasks(userId, unitId);

      const user = { userId, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-member-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-removed-from-unit-members', { unitId, userId, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeMember',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove member list.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {Array<string>} params.userIdList User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {TaskModel} params.taskModel Task model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMemberList({
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
  }) {
    // Remove member.
    let unit;
    let exceptionMessage;
    let userId;
    try {
      unit = await unitModel.removeMemberList(unitId, userIdList);

      userId = userIdList.join(',');

      // Remove performer user from tasks.
      await taskModel.removePerformerUserListFromTasks(userIdList, unitId);

      const user = { userId, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-member-list-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-removed-from-unit-members-list', { unitId, userIdList, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeMemberList',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove head.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.userId User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {TaskModel} params.taskModel Task model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeHead({ unitId, userId, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove head.
    let unit;
    let exceptionMessage;
    try {
      unit = await unitModel.removeHead(unitId, userId);

      // Remove performer user from tasks.
      await taskModel.removePerformerUserFromTasks(userId, unitId);

      const user = { userId, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-head-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-removed-from-unit-heads', { unitId, userId, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeHead',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove head.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {Array<string>} params.userIdList User ID.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {TaskModel} params.taskModel Task model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeHeadList({
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
  }) {
    // Remove head.
    let unit;
    let exceptionMessage;
    let userId;
    try {
      unit = await unitModel.removeHeadList(unitId, userIdList);

      userId = userIdList.join(',');

      // Remove performer user from tasks.
      await taskModel.removePerformerUserListFromTasks(userIdList, unitId);

      const user = { userId, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-head-list-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-removed-from-unit-heads-list', { unitId, userIdList, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeHeadList',
      unitId,
      userId,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove member IPN.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.ipn User IPN.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMemberIpn({ unitId, ipn, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove member IPN.
    let unit;
    let exceptionMessage;
    try {
      unit = await unitModel.removeMemberIpn(unitId, ipn);

      const user = { ipn, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-member-ipn-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-ipn-removed-from-unit-members', { unitId, ipn, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeMemberIpn',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove member IPN list.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {Array<string>} params.ipnList User IPN list.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMemberIpnList({ unitId, ipnList, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove member IPN.
    let unit;
    let exceptionMessage;
    let ipn;
    try {
      unit = await unitModel.removeMemberIpnList(unitId, ipnList);

      ipn = ipnList.join(',');

      const user = { ipn, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-member-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-member-ipn-list-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-ipn-list-removed-from-unit-members', { unitId, ipnList, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeMemberIpnList',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove head IPN.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {string} params.ipn User IPN.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeHeadIpn({ unitId, ipn, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove head IPN.
    let unit;
    let exceptionMessage;
    try {
      unit = await unitModel.removeHeadIpn(unitId, ipn);

      const user = { ipn, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-head-ipn-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-ipn-removed-from-unit-heads', { unitId, ipn, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeHeadIpn',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Remove head IPN list.
   * @param {object} params Params.
   * @param {number} params.unitId Unit ID.
   * @param {Array<string>} params.ipnList User IPN list.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeHeadIpnList({ unitId, ipnList, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    // Remove head IPN.
    let unit;
    let exceptionMessage;
    let ipn;
    try {
      unit = await unitModel.removeHeadIpnList(unitId, ipnList);

      ipn = ipnList.join(',');

      const user = { ipn, ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Save to access history.
      await accessHistoryModel.save({
        operationType: 'deleted-from-head-unit',
        user,
        currentUser,
        unit: unit,
        workflow: { id: workflowId },
      });
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-remove-head-ipn-list-error', { error: exceptionMessage });
      throw error;
    }

    // Log user's units.
    log.save('user-ipn-list-removed-from-unit-heads', { unitId, ipnList, workflowId, eventTemplate, userName, initUserName, initUserId });

    // Create and return result.
    const userResult = new UserResult({
      operation: 'removeHeadIpnList',
      unitId,
      ipn,
      unit,
      error: exceptionMessage,
    });
    return userResult;
  }

  /**
   * Update user info.
   * @param {string} userId User ID.
   * @param {object} userData User data.
   * @param {string} workflowId Workflow ID.
   * @param {string} eventTemplate Event template ID.
   * @returns {Promise<UserResult>}
   */
  async updateUser(userId, userData, workflowId, eventTemplate) {
    let exceptionMessage;
    let requestOptions;
    try {
      requestOptions = {
        url: `${this.server}:${this.port}${this.routes.updateUser}/${userId}`,
        method: HttpRequest.Methods.PUT,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: userData,
      };
      const response = await HttpRequest.send(requestOptions);

      // Log user's units.
      log.save('user-updated', { userId, response, workflowId, eventTemplate });

      if (response !== 'ok') {
        throw new Error('Invalid response.');
      }

      return response;
    } catch (error) {
      exceptionMessage = error && error.message;
      log.save('event-user-update-user-error', { error: exceptionMessage, requestOptions });
      throw error;
    }
  }

  /**
   * Search user.
   * @param {object} searchData Search data.
   * @param {UnitModel} unitModel Unit model.
   * @returns {Promise<*>}
   */
  async searchUser(searchData, unitModel) {
    let exceptionMessage;
    let allNeededUsers = [];
    let { userIds = [], ids = [], unitIds = [], codes = [], code, edrpou = [], search, basedOn = [] } = searchData;
    if (code) codes.push(code);
    const edrpouArray = Array.isArray(edrpou) ? edrpou : [edrpou];
    if (ids.length > 0) unitIds = [...unitIds, ...ids];

    // Get units.
    let units = [];
    if (unitIds.length > 0) {
      unitIds = unitIds.map((unit) => parseInt(unit));
      try {
        const allUnits = await unitModel.getAll();
        units = allUnits.filter((v) => unitIds.includes(v.id));
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-search-user-unit-model-get-all-error', { error: exceptionMessage });
        throw error;
      }
    }

    // Get all units by base unit.
    if (basedOn.length > 0) {
      try {
        const allUnits = await unitModel.getAll();
        for (let unit of allUnits) {
          const includesBasedOn = unit.basedOn.some((el) => basedOn.includes(el));
          if (includesBasedOn) units.push(unit);
        }
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-search-user-unit-model-get-all-error', { error: exceptionMessage });
        throw error;
      }
    }

    // Define units heads and members.
    const unitsHeads = units.reduce((t, v) => [...t, ...v.heads], []);
    const unitsMembers = units.reduce((t, v) => [...t, ...v.members], []);

    // Get all needed users IDs list.
    const allNeededUsersIds = [...new Set([...userIds, ...unitsHeads, ...unitsMembers])];

    // Define all needed users data ... by ids.

    if (allNeededUsersIds.length > 0) {
      try {
        const response = await HttpRequest.send({
          url: `${this.server}:${this.port}${this.routes.getUserInfoById}`,
          method: HttpRequest.Methods.POST,
          headers: {
            'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
            'x-trace-id': getTraceId(),
            Authorization: this.basicAuthHeader,
          },
          body: { id: allNeededUsersIds },
        });
        allNeededUsers = response.map((user) => this.filterUserFields(user));
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-search-user-get-user-info-by-id-error', { error: exceptionMessage });
        if (exceptionMessage !== '[]') throw error;
      }
    }

    // ... by codes. Attention! Code - just another name for ipn.
    for (const code of codes) {
      try {
        const userData = await HttpRequest.send({
          url: `${this.server}:${this.port}${this.routes.getUserByCode}`,
          method: HttpRequest.Methods.POST,
          headers: {
            'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
            'x-trace-id': getTraceId(),
            Authorization: this.basicAuthHeader,
          },
          body: { ipn: code },
        });
        if (!userData || !Array.isArray(userData)) continue;
        for (const user of userData) allNeededUsers.push(this.filterUserFields(user));
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-search-user-get-user-by-code-error', { error: exceptionMessage });
        if (exceptionMessage !== '[]') throw error;
      }
    }
    if (edrpouArray.length) {
      try {
        const usersData = await HttpRequest.send({
          url: `${this.server}:${this.port}${this.routes.getUserByEdrpou}`,
          method: HttpRequest.Methods.POST,
          headers: {
            'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
            'x-trace-id': getTraceId(),
            Authorization: this.basicAuthHeader,
          },
          body: { edrpou: edrpouArray },
        });
        if (usersData && Array.isArray(usersData)) {
          allNeededUsers = [...allNeededUsers, ...usersData.map((user) => this.filterUserFields(user))];
        }
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-search-user-get-user-by-edrpou-error', { error: exceptionMessage });
        if (exceptionMessage !== '[]') throw error;
      }
    }

    // ... by search string
    if (search) {
      const foundUsers = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.searchUsers}`,
        method: HttpRequest.Methods.POST,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: { searchString: search, limit: this.searchUsersLimit },
      });
      if (Array.isArray(foundUsers) && foundUsers.length > 0) {
        allNeededUsers = [...allNeededUsers, ...foundUsers.map((user) => this.filterUserFields(user))];
      }
    }
    allNeededUsers = _.uniqBy(allNeededUsers, 'userId');

    return allNeededUsers || [];
  }

  /**
   * @param {string} unitId Unit Id.
   * @param {string} userId User Id.
   * @param {UnitModel} unitModel Unit model.
   */
  async checkUserUnitsExclusiveRules(unitId, userId, unitModel, userIpn) {
    // Get unit exclusive rules.
    const unitExclusiveRules = await this.unitRulesModel.getAllByType('exclusive');
    if (unitExclusiveRules.length === 0) {
      return;
    }

    if (userIpn && !userId) {
      const usersByIpn = await this.searchUser({ codes: [userIpn] }, unitModel);
      userId = usersByIpn && usersByIpn[0] && usersByIpn[0].userId;
    }

    const allUnits = await unitModel.getAll();
    const head = allUnits.filter((v) => v.heads.includes(userId));
    const member = allUnits.filter((v) => v.members.includes(userId));
    const allUserUnits = [...new Set([...head, ...member])];
    const allUserUnitsIds = allUserUnits.map((v) => v.id);

    for (const userUnitId of allUserUnitsIds) {
      if (unitExclusiveRules.some((v) => v.includes(userUnitId) && v.includes(unitId) && userUnitId !== unitId)) {
        throw new Error(`Unit exclusive rules error, user unit id: ${userUnitId}`);
      }
    }
  }

  /**
   * Remove head IPN list.
   * @param {object} params Params.
   * @param {Array<number>} params.unitIdList Unit ID.
   * @param {Array<string>} params.ipnList User IPN list.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async addMembersToUnitsIpn({ unitIdList, ipnList, unitModel, accessHistoryModel, workflowId, eventTemplate, userName, initUserName, initUserId }) {
    const userResults = [];
    for (const unitId of unitIdList) {
      // Check that all member ipn list already in unit.
      ipnList = ipnList.map((v) => (typeOf(v) === 'number' ? `${v}` : v));
      ipnList = [...new Set(ipnList)];

      const currentUnitMemberIpnList = await this.getCurrentUnitIpnList(unitId, ipnList, unitModel, 'member');
      const ipnListAlreadyInUnit = ipnList.filter((v) => currentUnitMemberIpnList.includes(v));
      if (ipnListAlreadyInUnit.length === ipnList.length) {
        userResults.push(
          new UserResult({
            operation: 'addMembersToUnitsIpn',
            unitId,
            error: `All ipns (${ipnList.join(',')}) already in unit (members_ipn).`,
          }),
        );
        continue;
      }

      const newIpnListToAdd = ipnList.filter((v) => !currentUnitMemberIpnList.includes(v));

      const user = { ipn: newIpnListToAdd.join(','), ...(userName && { name: userName }) };
      const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

      // Add member.
      let unit;
      let exceptionMessage;
      try {
        // Check unit exclusive rules.
        for (const newIpn of newIpnListToAdd) {
          await this.checkUserUnitsExclusiveRules(unitId, undefined, unitModel, newIpn);
        }

        unit = await unitModel.addMemberIpnList(unitId, newIpnListToAdd);

        // Save to access history.
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user,
          currentUser,
          unit: unit,
          workflow: { id: workflowId },
        });
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-ipn-add-member-error', { error: exceptionMessage });
        throw error;
      }

      // Add member to base units.
      const { basedOn = [] } = unit || {};
      for (const baseUnitId of basedOn) {
        try {
          await unitModel.addMemberIpnList(baseUnitId, newIpnListToAdd);

          // Save to access history.
          const baseUnit = await unitModel.findById(baseUnitId);
          await accessHistoryModel.save({
            operationType: 'added-to-member-unit',
            user,
            currentUser,
            unit: baseUnit,
            workflow: { id: workflowId },
          });
        } catch (error) {
          log.save('event-ipn-add-member-to-base-error', { error: error && error.message });
          throw error;
        }
      }

      // Log user's units.
      log.save('user-added-to-unit-member-ipns', {
        unitId,
        newIpnListToAdd: newIpnListToAdd.join(','),
        workflowId,
        eventTemplate,
        userName,
        initUserName,
        initUserId,
      });

      userResults.push(
        new UserResult({
          operation: 'addMembersToUnitsIpn',
          unitId,
          result: `New ipns (${newIpnListToAdd.join(',')}) added to unit (members_ipn). The rest ipns (${ipnListAlreadyInUnit.join(
            ',',
          )}) where already in unit (members_ipn).`,
        }),
      );
    }

    return userResults;
  }

  /**
   * Remove head IPN list.
   * @param {object} params Params.
   * @param {Array<number>} params.unitIdList Unit ID.
   * @param {Array<string>} params.ipnList User IPN list.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMembersFromUnitsIpn({
    unitIdList,
    ipnList,
    unitModel,
    accessHistoryModel,
    workflowId,
    eventTemplate,
    userName,
    initUserName,
    initUserId,
  }) {
    const userResults = [];
    for (const unitId of unitIdList) {
      // Remove member IPN.
      let exceptionMessage;
      let ipnListWhichWereActuallyRemoved;
      let ipnListWhichWereNotInUnit;
      try {
        const unitBeforeUpdate = await unitModel.findById(unitId);
        const unitAfterUpdate = await unitModel.removeMemberIpnList(unitId, ipnList);

        ipnListWhichWereActuallyRemoved = unitBeforeUpdate.membersIpn.filter((v) => !unitAfterUpdate.membersIpn.includes(v));
        ipnListWhichWereNotInUnit = ipnList.filter((v) => !ipnListWhichWereActuallyRemoved.includes(v));

        const user = { ipn: ipnListWhichWereActuallyRemoved.join(','), ...(userName && { name: userName }) };
        const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

        // Save to access history.
        await accessHistoryModel.save({
          operationType: 'deleted-from-member-unit',
          user,
          currentUser,
          unit: unitAfterUpdate,
          workflow: { id: workflowId },
        });
      } catch (error) {
        exceptionMessage = error && error.message;
        log.save('event-user-remove-member-ipn-list-error', { error: exceptionMessage });
        throw error;
      }

      // Log user's units.
      log.save('user-ipn-list-removed-from-unit-members', {
        unitId,
        ipnListWhichWereActuallyRemoved,
        workflowId,
        eventTemplate,
        userName,
        initUserName,
        initUserId,
      });

      userResults.push(
        new UserResult({
          operation: 'removeMembersFromUnitsIpn',
          unitId,
          result: `Ipns (${ipnListWhichWereActuallyRemoved.join(
            ',',
          )}) removed from unit (members_ipn). The rest ipns (${ipnListWhichWereNotInUnit}) where not in unit (members_ipn).`,
        }),
      );
    }

    return userResults;
  }

  /**
   * Remove head IPN list.
   * @param {object} params Params.
   * @param {Array<number>} params.unitIdList Unit ID.
   * @param {Array<string>} params.ipnList User IPN list.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @param {string} params.userName User Name.
   * @param {string} params.initUserName Init User Name.
   * @param {string} params.initUserId Init User ID.
   * @returns {Promise<UserResult>} Unit result promise.
   */
  async removeMembersFromUnitsByIpn({
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
  }) {
    const userResults = [];
    for (const unitId of unitIdList) {
      // Remove member.
      let userIdListWhichWereActuallyRemoved;
      let userIdListWhichWereNotInUnit;
      const userIdList = [];
      for (const ipn of ipnList) {
        try {
          const userData = await HttpRequest.send({
            url: `${this.server}:${this.port}${this.routes.getUserByCode}`,
            method: HttpRequest.Methods.POST,
            headers: {
              'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
              'x-trace-id': getTraceId(),
              Authorization: this.basicAuthHeader,
            },
            body: { ipn: ipn },
          });
          if (userData.length > 1) {
            userResults.push(
              new UserResult({
                operation: 'removeMembersFromUnitsByIpn',
                unitId,
                ipn: ipn,
                error: 'Found more than one user by ipn.',
              }),
            );
            continue;
          }
          const userId = userData?.[0]?.userId;
          if (userId) {
            userIdList.push(userId);
          }
        } catch (error) {
          log.save('event-user-search-user-get-user-by-ipn-error', { error: error.toString() });
        }
      }

      if (!userIdList.length) {
        userResults.push(
          new UserResult({
            operation: 'removeMembersFromUnitsByIpn',
            unitId,
            error: `Users by ipns (${ipnList.join(',')}) not found.`,
          }),
        );
        continue;
      }

      try {
        const unitBeforeUpdate = await unitModel.findById(unitId);
        const unitAfterUpdate = await unitModel.removeMemberList(unitId, userIdList);

        userIdListWhichWereActuallyRemoved = unitBeforeUpdate.members.filter((v) => !unitAfterUpdate.members.includes(v));
        userIdListWhichWereNotInUnit = userIdList.filter((v) => !userIdListWhichWereActuallyRemoved.includes(v));

        // Remove performer user from tasks.
        await taskModel.removePerformerUserListFromTasks(userIdList, unitId);

        const user = { userId: userIdList.join(','), ...(userName && { name: userName }) };
        const currentUser = { ...(initUserId && { userId: initUserId }), ...(initUserName && { name: initUserName }) };

        // Save to access history.
        await accessHistoryModel.save({
          operationType: 'deleted-from-member-unit',
          user,
          currentUser,
          unit: unitAfterUpdate,
          workflow: { id: workflowId },
        });
      } catch (error) {
        log.save('event-user-remove-member-list-error', { error: error.toString() });
        throw error;
      }

      // Log user's units.
      log.save('user-removed-from-unit-members-list', {
        unitId,
        userIdList: userIdList.join(','),
        workflowId,
        eventTemplate,
        userName,
        initUserName,
        initUserId,
      });

      // Create and return result.
      userResults.push(
        new UserResult({
          operation: 'removeMembersFromUnitsByIpn',
          unitId,
          result: `UserIds (${userIdListWhichWereActuallyRemoved.join(
            ',',
          )}) removed from unit (members). The rest userIds (${userIdListWhichWereNotInUnit.join(',')}) where not in unit (members).`,
        }),
      );
    }

    return userResults;
  }

  filterUserFields(user) {
    return {
      userId: user.userId,
      name: `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim(),
      companyName: user.companyName,
      isLegal: user.isLegal,
      isIndividualEntrepreneur: user.isIndividualEntrepreneur,
      email: user.email,
      phone: user.phone,
      ipn: user.ipn,
      edrpou: user.edrpou,
      avaUrl: user.avaUrl ? `${this.server}:${this.port}${user.avaUrl}` : '',
    };
  }
}

module.exports = EventUser;
