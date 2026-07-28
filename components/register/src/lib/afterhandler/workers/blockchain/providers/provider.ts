import Log from '../../../../log';

// Constants.
const DATA_NAME_PREFIX = '';

/**
 * Blockchain provider.
 */
export default class BlockchainProvider {
  log: Log;
  config: any;

  /**
   * Blockchain provider constructor.
   * @param {string} config Provider config.
   */
  constructor(config) {
    this.log = Log.getInstance();
    this.config = config;
  }

  /**
   * Provider name.
   */
  static get providerName(): string {
    throw new Error('Method should be redefined in child class.');
  }

  /**
   * Get blockchain data ID.
   * @param {string} entity Entity.
   * @param {string} id ID.
   * @returns {string} Blockchain data ID.
   */
  getBlockchainDataId(entity, id) {
    return `${entity}-${id}`;
  }

  /**
   * Get blockchain data name
   * @param {string} entity Entity.
   * @returns {string} Blockchain data name.
   */
  getBlockchainDataName(entity) {
    return `${DATA_NAME_PREFIX}${entity}`;
  }

  /**
   * Get data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   */

  async getData(_entity, _id) {
    throw new Error('Method should be redefined in child class.');
  }

  /**
   * Create data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   * @param {object} data Data.
   */

  async createData(_entity, _id, _userId, _data) {
    throw new Error('Method should be redefined in child class.');
  }

  /**
   * Update data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   * @param {object} data Data.
   */

  async updateData(_entity, _id, _userId, _data) {
    throw new Error('Method should be redefined in child class.');
  }

  /**
   * Delete data.
   * @param {string} entity Entity name.
   * @param {string} id Entity record ID.
   * @param {string} userId User ID.
   */

  async deleteData(_entity, _id, _userId) {
    throw new Error('Method should be redefined in child class.');
  }
}
