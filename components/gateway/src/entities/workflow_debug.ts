import { Entity } from './entity';

/**
 * Workflow debug entity.
 */
export class WorkflowDebugEntity extends Entity {
  id: string;
  workflowId: string;
  serviceName: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor.
   * @param {object} options Workflow debug object.
   * @param {string} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.serviceName Service name.
   * @param {object} options.data Data.
   * @param {string} options.type Type.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, workflowId, serviceName, data, createdAt, updatedAt }: any) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.serviceName = serviceName;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
