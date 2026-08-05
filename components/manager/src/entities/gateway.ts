import { Entity } from './entity';
import { WorkflowEntity } from './workflow';

interface GatewayEntityOptions {
  id?: string;
  gatewayTemplateId?: number;
  gatewayTypeId?: number;
  workflowId?: string;
  name?: string;
  createdBy?: string;
  updatedBy?: string;
  data?: any;
}

/**
 * Gateway entity.
 */
export class GatewayEntity extends Entity {
  id: string;
  gatewayTemplateId: number;
  gatewayTypeId: number;
  workflowId: string;
  name: string;
  createdBy: string;
  updatedBy: string;
  data: any;
  workflowEntity: WorkflowEntity;

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
   */
  constructor({ id, gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data }: GatewayEntityOptions) {
    super();

    this.id = id;
    this.gatewayTemplateId = gatewayTemplateId;
    this.gatewayTypeId = gatewayTypeId;
    this.workflowId = workflowId;
    this.name = name;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
  }
}
