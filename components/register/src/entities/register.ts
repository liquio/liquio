import Entity from './entity';

/**
 * Register entity.
 */
export default class RegisterEntity extends Entity {
  id: string;
  name: string;
  description: string;
  parentId: string;
  meta: object;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  /**
   * Constructor.
   * @param {object} raw Register RAW object.
   * @param {number} raw.id ID.
   * @param {string} raw.name Name.
   * @param {string} raw.description Description.
   * @param {number} raw.parent_id Parent ID.
   * @param {string} raw.meta Meta.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   */
  constructor({ id, name, description, parent_id, meta, created_by, updated_by, created_at, updated_at }) {
    super();

    this.id = id;
    this.name = name;
    this.description = description;
    this.parentId = parent_id;
    this.meta = meta;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}
