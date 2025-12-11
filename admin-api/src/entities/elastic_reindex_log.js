const Entity = require('./entity');

class ElasticReindexLogEntity extends Entity {
  constructor({ id, userId, userName, filters, status, errorMessage, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.userId = userId;
    this.userName = userName;
    this.filters = filters;
    this.status = status;
    this.errorMessage = errorMessage;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = ElasticReindexLogEntity;
