import { Entity } from './entity';

/**
 * Workflow template category entity.
 */
export class WorkflowTemplateCategoryEntity extends Entity {
  id: any;
  parentId: any;
  name: any;

  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {number} options.parentId Parent ID.
   * @param {string} options.name Name.
   */
  constructor({ id, parentId, name }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.name = name;
  }

  getFilterProperties() {
    return ['id', 'parentId', 'name'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}
