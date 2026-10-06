import { Model } from './model';

/**
 * Raw queries model.
 */
export class RawQueryModel extends Model {
  static singleton: RawQueryModel;

  constructor() {
    if (!RawQueryModel.singleton) {
      super();
      RawQueryModel.singleton = this;
    }
    return RawQueryModel.singleton;
  }

  /**
   * Create sequence.
   * @param {string} sequenceName Sequence name.
   * @returns {Promise<any>}
   */
  async createSequence(sequenceName) {
    let result;
    try {
      result = await this.db.query(`CREATE SEQUENCE IF NOT exists ${sequenceName} START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1`);
    } catch (error: any) {
      error.details = `Can't create sequence ${sequenceName}`;
      throw error;
    }
    global.log.save('create-sequence-result', { result, sequenceName }); // TODO: remove it after test.
    return result;
  }

  /**
   * Get nextval of sequence.
   * @param {string} sequenceName Sequence name.
   * @returns {Promise<number>}
   */
  async getNextvalOfSequence(sequenceName) {
    let queryResult;
    try {
      queryResult = await this.db.query('SELECT nextval(:sequenceName)', { replacements: { sequenceName } });
    } catch (error: any) {
      error.details = `Can't get nextval of sequence ${sequenceName}`;
      throw error;
    }
    const [[increment]] = queryResult;
    return increment?.nextval;
  }
}
