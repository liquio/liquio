import { Entity } from './entity';

/**
 * Gateway template entity.
 */
export class GatewayTemplateEntity extends Entity {
  id: number;
  gatewayTypeId: number;
  name: string;
  description: string;
  jsonSchema: any;

  /**
   * Constructor.
   * @param {object} options Gateway template object.
   * @param {number} options.id ID.
   * @param {nubmer} options.gatewayTypeId Gateway type ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.jsonSchema JSON Schema.
   */
  constructor({ id, gatewayTypeId, name, description, jsonSchema }: any) {
    super();

    this.id = id;
    this.gatewayTypeId = gatewayTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
  }
}
