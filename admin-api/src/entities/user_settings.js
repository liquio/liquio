const Entity = require('./entity');

/**
 * User settings entity.
 */
class UserSettingsEntity extends Entity {
  /**
   * User settings entity constructor.
   * @param {object} options User settings object.
   * @param {string} options.id ID.
   * @param {string} options.userId User ID.
   * @param {object} options.data JSON data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, userId, data, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.userId = userId;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = UserSettingsEntity;
