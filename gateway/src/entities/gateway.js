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
   * @param {string} options.version Version.
   */
  constructor({ id, gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data, version }) {
    super();

    this.id = id;
    this.gatewayTemplateId = gatewayTemplateId;
    this.gatewayTypeId = gatewayTypeId;
    this.workflowId = workflowId;
    this.name = name;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.version = version;
  }
}

module.exports = GatewayEntity;
