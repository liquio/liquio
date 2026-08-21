/**
 * User result.
 * @typedef {import('../../../entities/unit')} UnitEntity Unit entity.
 */
class UserResult {
  /**
   * User result constructor.
   * @param {object} options Params.
   * @param {'addMember'|'addMemberIpn'|'addHead'|'addHeadIpn'|'removeMember'|'removeHead'|'removeMemberIpn'|'removeHeadIpn'|'updateUser'} options.operation Event user operation.
   * @param {number} options.unitId Unit ID.
   * @param {string} options.userId User ID.
   * @param {string[]} options.userIdList User ID list.
   * @param {UnitEntity} options.unit Unit entity.
   * @param {string} options.ipn Ipn.
   * @param {string[]} options.ipnList Ipn list.
   * @param {object} options.userData User data.
   * @param {string} options.error Error message.
   * @param {string} options.result Result message.
   */
  constructor({ operation, unitId, userId, userIdList, unit, ipn, ipnList, userData, error, result }) {
    // Init params.
    this.createdAt = new Date();
    this.operation = operation;
    this.unitId = unitId;
    this.userId = userId;
    this.userIdList = userIdList;
    this.unit = unit;
    this.ipn = ipn;
    this.ipnList = ipnList;
    this.userData = userData;
    this.error = error;
    this.result = result;
    this.isHandled = !!unit || !!result;
  }
}

module.exports = UserResult;
