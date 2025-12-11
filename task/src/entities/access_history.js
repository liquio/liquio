
const Entity = require('./entity');

/**
 * Access history entity.
 */
class AccessHistoryEntity extends Entity {
  /**
   * Access history entity constructor.
   * @param {object} options Access history object.
   * @param {string} options.id ID.
   * @param {string} options.userId User ID.
   * @param {string} options.userName User name.
   * @param {string} options.ipn Ipn.
   * @param {'added-to-head-unit'|'added-to-member-unit'|'deleted-from-head-unit'|'deleted-from-member-unit'|'added-to-admin'|'deleted-from-admin'} options.operationType Operation type.
   * @param {number} options.unitId Unit ID.
   * @param {string} options.unitName Unit name.
   * @param {string} options.initUserId Init user ID.
   * @param {string} options.initUserName Init unit name.
   * @param {string} options.initIpn Init ipn.
   * @param {string} options.initWorkflowId Init workflow ID.
   * @param {string} options.initWorkflowName Init workflow name.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({
    id,
    userId,
    userName,
    ipn,
    operationType,
    unitId,
    unitName,
    initUserId,
    initUserName,
    initIpn,
    initWorkflowId,
    initWorkflowName,
    createdAt,
    updatedAt
  }) {
    super();

    this.id = id;
    this.userId = userId;
    this.userName = userName;
    this.ipn = ipn;
    this.operationType = operationType;
    this.unitId = unitId;
    this.unitName = unitName;
    this.initUserId = initUserId;
    this.initUserName = initUserName;
    this.initIpn = initIpn;
    this.initWorkflowId = initWorkflowId;
    this.initWorkflowName = initWorkflowName;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = AccessHistoryEntity;
