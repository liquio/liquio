import { Entity } from './entity';

/**
 * Event type entity.
 */
export class EventTypeEntity extends Entity {
  id: any;
  name: any;

  /**
   * Constructor.
   * @param {object} options Event type object.
   * @param {string} options.id ID.
   * @param {string} options.name Name.
   */
  constructor({ id, name }: any) {
    super();

    this.id = id;
    this.name = name;
  }
}
