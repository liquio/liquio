import { Entity } from './entity';

/**
 * Gateway template entity.
 */
export class GatewayTemplateEntity extends Entity {
  id: any;
  gatewayTypeId: any;
  name: any;
  description: any;
  jsonSchema: any;
  createdAt: any;
  updatedAt: any;

  /**
   * Constructor.
   * @param {object} options Gateway template object.
   * @param {number} options.id ID.
   * @param {nubmer} options.gatewayTypeId Gateway type ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {object} options.jsonSchema JSON Schema.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, gatewayTypeId, name, description, jsonSchema, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.gatewayTypeId = gatewayTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
