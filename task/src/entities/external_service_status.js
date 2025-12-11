const Entity = require('./entity');


class ExternalServiceStatusEntity extends Entity {
  /**
   * @param {object} options
   * @param {string} options.id
   * @param {Date} options.createdAt
   * @param {Date} options.updatedAt
   * @param {string} options.service
   * @param {string} options.user
   * @param {string} options.ip
   * @param {string} options.data
   * @param {string} options.contentType
   * @param {string} options.state
   * @param {string} options.rejectedReason
   */
  constructor({ id, createdAt, updatedAt, service, user, ip, data, contentType, state, rejectedReason }) {
    super();

    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.service = service;
    this.user = user;
    this.ip = ip;
    this.data = data;
    this.contentType = contentType;
    this.state = state;
    this.rejectedReason = rejectedReason;
  }
}

module.exports = ExternalServiceStatusEntity;
