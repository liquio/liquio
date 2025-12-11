const _ = require('lodash');

const TaskService = require('../services/task');
const RegisterService = require('../services/register');

/**
 * Unit Access business.
 */
class UnitAccessBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UnitAccessBusiness.singleton) {
      this.config = config;
      this.taskService = new TaskService();
      this.registerService = new RegisterService();
      UnitAccessBusiness.singleton = this;
    }

    // Return singleton.
    return UnitAccessBusiness.singleton;
  }

  /**
   * Get unit access.
   * @param {object} params Params.
   * @returns {Promise<object[]>}
   */
  async getUnitAccess(params) {
    const unitAccess = await this.taskService.getUnitAccess(params);

    return unitAccess;
  }

  /**
   * Find unit access by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findUnitAccessById(id) {
    const unitAccess = await this.taskService.findUnitAccessById(id);

    return unitAccess;
  }

  /**
   * Create unit access.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async createUnitAccess(data) {
    const unitAccess = await this.taskService.createUnitAccess(data);

    return unitAccess;
  }

  /**
   * Update unit access.
   * @param {number} id ID.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async updateUnitAccessById(id, data) {
    if (data?.data?.strictAccess?.keys) {
      const previousUnitAccess = await this.taskService.findUnitAccessById(id);
      const newKeys = _.difference(data.data.strictAccess.keys, previousUnitAccess?.data?.strictAccess?.keys || []);
      if (newKeys.length > 0) {
        for (const newKey of newKeys) {
          const key = await this.registerService.findKeyById(newKey);

          // Check if the key is personal.
          if (key?.meta?.isPersonal) {
            throw new Error(`Cannot add the personal key(${newKey}) to strict access.`);
          }
        }
      }
    }
    const unitAccess = await this.taskService.updateUnitAccessById(id, data);

    return unitAccess;
  }

  /**
   * Delete unit access.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async deleteUnitAccessById(id) {
    const unitAccess = await this.taskService.deleteUnitAccessById(id);

    return unitAccess;
  }
}

module.exports = UnitAccessBusiness;
