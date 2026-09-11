import Entity from './entity';

/**
 * Access log entity.
 */
export default class AccessLogEntity extends Entity {
  id: string;
  recordId: string;
  keyId: number;
  data: object;
  createdAt: string;
  updatedAt: string;

  /**
   * Constructor.
   * @param {object} raw Register RAW object.
   * @param {string} raw.id ID.
   * @param {string} raw.record_id Record ID.
   * @param {number} raw.key_id Key ID.
   * @param {object} raw.data Data.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   */
  constructor({ id, record_id, key_id, data, created_at, updated_at }) {
    super();

    this.id = id;
    this.recordId = record_id;
    this.keyId = key_id;
    this.data = data;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}
