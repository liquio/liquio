import { Entity } from './entity';

interface GatewayEntityOptions {
  /** ID. */
  id: string;
  /** Gateway template ID. */
  gatewayTemplateId: number;
  /** Gateway type ID. */
  gatewayTypeId: number;
  /** Workflow ID. */
  workflowId: string;
  /** Name. */
  name: string;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
  /** Data. */
  data: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Gateway entity.
 */
export class GatewayEntity extends Entity<GatewayEntityOptions> {}

export interface GatewayEntity extends GatewayEntityOptions {}
