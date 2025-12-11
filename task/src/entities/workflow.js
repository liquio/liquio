
const Entity = require('./entity');

/**
 * Workflow entity.
 */
class WorkflowEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow object.
   * @param {string} options.id ID.
   * @param {string} options.parentId Parent ID.
   * @param {number} options.workflowTemplateId Workflow template ID.
   * @param {string} options.name Name.
   * @param {boolean} options.isFinal Status.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {object} options.data Data.
   * @param {Date} options.dueDate Due date.
   * @param {number} options.workflowStatusId Workflow status ID.
   * @param {string} options.number Number.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @param {object} [options.userData] User data.
   * @param {boolean} [options.hasUnresolvedErrors] Has unresolved errors.
   * @param {string} options.createdByIpn Created by ipn.
   * @param {number[]} options.createdByUnitHeads Created by unit heads.
   * @param {number[]} options.createdByUnits Created by units.
   * @param {number[]} options.observerUnits Observer units.
   * @param {boolean} options.isPersonal Is personal.
   * @param {object} options.statuses Statuses.
   */
  constructor({
    id,
    parentId,
    workflowTemplateId,
    name,
    isFinal,
    cancellationTypeId,
    createdBy,
    updatedBy,
    data,
    dueDate,
    workflowStatusId,
    number,
    createdAt,
    updatedAt,
    userData,
    hasUnresolvedErrors,
    createdByIpn,
    createdByUnitHeads,
    createdByUnits,
    observerUnits,
    isPersonal,
    statuses
  }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.workflowTemplateId = workflowTemplateId;
    this.name = name;
    this.isFinal = isFinal;
    this.cancellationTypeId = cancellationTypeId;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.dueDate = dueDate;
    this.workflowStatusId = workflowStatusId;
    this.number = number;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.userData = userData;
    this.hasUnresolvedErrors = hasUnresolvedErrors;
    this.createdByIpn = createdByIpn;
    this.createdByUnitHeads = createdByUnitHeads;
    this.createdByUnits = createdByUnits;
    this.observerUnits = observerUnits;
    this.isPersonal = isPersonal;
    this.statuses = statuses;
  }

  getFilterProperties() {
    return [
      'id',
      'workflowTemplateId',
      'isFinal',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'timeline',
      'info',
      'files',
      'dueDate',
      'entryTaskId',
      'entryTaskFinishedAt',
      'lastEntryTaskId',
      'lastEntryTaskFinishedAt',
      'workflowStatusId',
      'number',
      'name',
      'userData',
      'externalIds',
      'createdByUnitHeads',
      'createdByUnits',
      'observerUnits',
      'isPersonal',
      'statuses'
    ];
  }

  getFilterPropertiesBrief() {
    return [
      'id',
      'workflowTemplateId',
      'isFinal',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'lastStepLabel',
      'lastStepDescription',
      'entryTask',
      'entryTaskId',
      'entryTaskFinishedAt',
      'lastEntryTaskId',
      'lastEntryTaskFinishedAt',
      'dueDate',
      'workflowStatusId',
      'number',
      'name',
      'userData',
      'externalIds',
      'createdByUnitHeads',
      'createdByUnits',
      'observerUnits',
      'isPersonal',
      'statuses'
    ];
  }

  /**
   * Has access.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs list.
   * @returns {boolean}
   */
  hasAccess(userId, userUnitIds) {
    if (this.createdBy === userId) {
      return true;
    }

    // Check created by unit heads.
    if (this.isCreatedByUnitHeads(userUnitIds.head)) {
      return true;
    }

    // Check created by units.
    if (this.isCreatedByUnits(userUnitIds.all)) {
      return true;
    }

    // Check observer units.
    if (this.isObserverUnits(userUnitIds.all)) {
      return true;
    }

    return false;
  }

  /**
   * Is created by unit heads.
   * @param {number[]} units Users.
   * @returns {boolean} Is performer indicator.
   */
  isCreatedByUnitHeads(units) {
    return (this.createdByUnitHeads || []).some(v => units.includes(v));
  }

  /**
   * Is created by units.
   * @param {number[]} units Users.
   * @returns {boolean} Is performer indicator.
   */
  isCreatedByUnits(units) {
    return (this.createdByUnits || []).some(v => units.includes(v));
  }

  /**
   * Is observer units.
   * @param {number[]} units Users.
   * @returns {boolean} Is performer indicator.
   */
  isObserverUnits(units) {
    return (this.observerUnits || []).some(v => units.includes(v));
  }
}

module.exports = WorkflowEntity;
