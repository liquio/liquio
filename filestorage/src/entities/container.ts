import { Entity } from './entity';

/**
 * Container entity.
 */
export class ContainerEntity extends Entity {
  id: number;
  name: string;
  description: string;
  parentId: number;
  meta: any;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  /**
   * Constructor.
   * @param {object} raw Container RAW object.
   * @param {number} raw.id ID.
   * @param {string} raw.name Name.
   * @param {string} raw.description Description.
   * @param {number} raw.parent_id Parent ID.
   * @param {object} raw.meta Meta.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   */
  constructor({ id, name, description, parent_id, meta, created_by, updated_by, created_at, updated_at }: any) {
    // Call parent constructor.
    super();

    // Save params.
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
