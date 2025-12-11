const Entity = require('./entity');

/**
 * Share access entity.
 */
class ShareAccessEntity extends Entity {
  /**
   * Share access entity constructor.
   * @param {object} options Share access object.
   * @param {string} options.id ID.
   * @param {object} options.shareFrom Share from.
   * @param {object} options.shareTo Share to.
   * @param {'create-workflow'|'edit-task'|'commit-task'} options.accessType Access type.
   * @param {object} options.accessDetails Access details.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, shareFrom, shareTo, accessType, accessDetails, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.shareFrom = shareFrom;
    this.shareTo = shareTo;
    this.accessType = accessType;
    this.accessDetails = accessDetails;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = ShareAccessEntity;
