
import { Entity } from './entity';

/**
 * Workflow error entity.
 */
export class WorkflowErrorEntity extends Entity {
  id: any;
  workflowId: any;
  serviceName: any;
  data: any;
  type: any;
  createdAt: any;
  updatedAt: any;

  /**
   * Constructor.
   * @param {object} options Workflow error object.
   * @param {number} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {number} options.serviceName Service name.
   * @param {object} options.data Data.
   * @param {string} options.type Type.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, workflowId, serviceName, data, type, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.serviceName = serviceName;
    this.data = data;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

