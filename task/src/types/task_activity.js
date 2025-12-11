const { InternalServerError } = require('../lib/errors');

/**
 * @typedef {'TASK_CREATED'|'TASK_PERFORMERS_CHANGED'|'TASK_COMMITTED'} Type
 * @typedef {'BY_USER'|'BY_SYSTEM'|'BY_EXTERNAL_SYSTEM'} CreateType
 * @typedef {'BY_USER'|'REASSIGN_TRIGGERED_BY_USER'} ChangeType
 * @typedef {'BY_USER'|'AUTO_COMMIT_BY_SYSTEM'|'DELAYED_AUTO_COMMIT_BY_SYSTEM'|'BY_EXTERNAL_SYSTEM'} CommitType
 * @typedef {string} SystemName
 * @typedef {string} UserId
 * @typedef {{all: Array<number>, head: Array<number>, member: Array<number>}} UserUnits
 * @typedef {Array<{userId: UserId, userUnits: UserUnits}>} AssignedUsers
 * @typedef {Array<number>} AssignedUnits
 * @typedef {Array<{userId: UserId, userUnits: UserUnits}>} UnassignedUsers
 * @typedef {Array<number>} UnassignedUnits
 */
class TaskActivity {
  /**
   * @param {Object} item
   * @param {Date} [item.createdAt]
   * @param {Type} item.type
   * @param {{[createType]: CreateType, [changeType]: ChangeType, [commitType]: CommitType, [systemName]: SystemName, [userId]: UserId, [userUnits]: UserUnits, [assignedUsers]: AssignedUsers, [assignedUnits]: AssignedUnits, [unassignedUsers]: UnassignedUsers, [unassignedUnits]: UnassignedUnits}} [item.details]
   */
  constructor({ createdAt, type, details = {} }) {
    if (!type) {
      throw new InternalServerError('TaskActivity.type required.');
    }
    if (type === 'TASK_CREATED') {
      if (!details.assignedUsers || !details.assignedUnits) {
        throw new InternalServerError('TaskActivity.details.assignedUsers/assignedUnits required.');
      }
      if (details.createType === 'BY_EXTERNAL_SYSTEM' && !details.systemName) {
        throw new InternalServerError('TaskActivity.details.systemName required.');
      }
      if (details.changeType === 'BY_USER' && (!details.userId || !details.userUnits)) {
        throw new InternalServerError('TaskActivity.details.userId/userUnits required.');
      }
    }
    if (type === 'TASK_PERFORMERS_CHANGED') {
      if (!details.assignedUsers || !details.assignedUnits || !details.unassignedUsers || !details.unassignedUnits) {
        throw new InternalServerError('TaskActivity.details.assignedUsers/assignedUnits/unassignedUsers/unassignedUnits required.');
      }
      if (
        (details.changeType === 'BY_USER' || details.changeType === 'REASSIGN_TRIGGERED_BY_USER') &&
        (!details.userId || !details.userUnits)
      ) {
        throw new InternalServerError('TaskActivity.details.userId/userUnits required.');
      }
    }
    if (type === 'TASK_COMMITTED') {
      if ((details.commitType === 'BY_EXTERNAL_SYSTEM' || details.commitType === 'AUTO_COMMIT_BY_SYSTEM' || details.commitType === 'DELAYED_AUTO_COMMIT_BY_SYSTEM') && !details.systemName) {
        throw new InternalServerError('TaskActivity.details.systemName required.');
      }
      if (details.changeType === 'BY_USER' && (!details.userId || !details.userUnits)) {
        throw new InternalServerError('TaskActivity.details.userId/userUnits required.');
      }
    }

    this.createdAt = createdAt || new Date();
    this.type = type;
    this.details = details;
  }
}

module.exports = TaskActivity;

