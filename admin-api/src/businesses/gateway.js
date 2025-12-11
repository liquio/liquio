const Exceptions = require('../exceptions');

// Constants.
const SEQUELIZE_CONSTRAINT_ERROR = 'SequelizeForeignKeyConstraintError';

/**
 * Gateway business.
 */
class GatewayBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!GatewayBusiness.singleton) {
      this.config = config;
      GatewayBusiness.singleton = this;
    }

    // Return singleton.
    return GatewayBusiness.singleton;
  }

  /**
   * Create or update.
   * @param {GatewayEntity} gatewayEntity Gateway Entity.
   * @returns {Promise<GatewayEntity>}
   */
  async createOrUpdate(gatewayEntity) {
    return models.gatewayTemplate.create(gatewayEntity);
  }

  /**
   * Delete gateway by ID.
   * @param {number} id Gateway ID.
   * @returns {Promise<GatewayEntity>}
   */
  async deleteById(id) {
    try {
      return await models.gatewayTemplate.deleteById(id);
    } catch (error) {
      if (error.name === SEQUELIZE_CONSTRAINT_ERROR) {
        throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.CONSTRAINT);
      }

      throw error;
    }
  }

  /**
   * Find gateway by ID.
   * @param {number} id Gateway ID.
   * @returns {Promise<GatewayEntity>}
   */
  async findById(id) {
    return await models.gatewayTemplate.findById(id);
  }
}

module.exports = GatewayBusiness;
