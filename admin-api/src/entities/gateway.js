const Entity = require('./entity');

/**
 * Gateway entity.
 */
class GatewayEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Gateway object.
   * @param {string} options.id ID.
   * @param {number} options.gatewayTemplateId Gateway template ID.
   * @param {number} options.gatewayTypeId Gateway type ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.name Name.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {object} options.data Data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.gatewayTemplateId = gatewayTemplateId;
    this.gatewayTypeId = gatewayTypeId;
    this.workflowId = workflowId;
    this.name = name;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = GatewayEntity;
