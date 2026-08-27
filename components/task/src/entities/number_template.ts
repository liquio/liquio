import { Entity } from './entity';

/**
 * Number template entity.
 */
export class NumberTemplateEntity extends Entity {
  id: any;
  name: any;
  template: any;

  /**
   * Constructor.
   * @param {object} options Number template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.template Template.
   */
  constructor({ id, name, template }) {
    super();

    this.id = id;
    this.name = name;
    this.template = template;
  }
}
