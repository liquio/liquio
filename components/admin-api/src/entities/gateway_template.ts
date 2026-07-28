import { Entity } from './entity';

interface GatewayTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Gateway type ID. */
  gatewayTypeId: number;
  /** Name. */
  name: string;
  /** Status. */
  description: string;
  /** JSON Schema. */
  jsonSchema: object;
  /** JSON Schema raw. */
  jsonSchemaRaw: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Gateway template entity.
 */
export class GatewayTemplateEntity extends Entity<GatewayTemplateEntityOptions> {}

export interface GatewayTemplateEntity extends GatewayTemplateEntityOptions {}
