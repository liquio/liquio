import Entity from './entity';

// Constants.
const OPERATIONS = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete'
};

/**
 * History entity.
 */
export default class HistoryEntity extends Entity {
  id: string;
  recordId: string;
  registerId: string;
  keyId: string;
  operation: string;
  data: object;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  person: object;
  meta: object;

  /**
   * Constructor.
   * @param {object} raw History RAW object.
   * @param {string} raw.id ID.
   * @param {string} raw.record_id Record ID.
   * @param {'create'|'update'|'delete'} raw.operation Operation.
   * @param {object} raw.data Parent ID.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   * @param {object} raw.person Person.
   * @param {object} raw.meta Meta.
   */
  constructor({ id, record_id, register_id, key_id, operation, data, created_by, updated_by, created_at, updated_at, person, meta }) {
    super();

    if (id) this.id = id;
    if (record_id) this.recordId = record_id;
    if (register_id) this.registerId = register_id;
    if (key_id) this.keyId = key_id;
    if (operation) this.operation = operation;
    if (data) this.data = data;
    if (created_by) this.createdBy = created_by;
    if (updated_by) this.updatedBy = updated_by;
    if (created_at) this.createdAt = created_at;
    if (updated_at) this.updatedAt = updated_at;
    if (person) this.person = person;
    if (meta) this.meta = meta;
  }

  /**
   * Operations.
   * @returns {OPERATIONS} History operations.
   */
  static get Operations() {
    return OPERATIONS;
  }
}
