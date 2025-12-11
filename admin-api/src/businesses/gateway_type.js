/**
 * Gateway type business.
 */
class GatewayTypeBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!GatewayTypeBusiness.singleton) {
      this.config = config;
      GatewayTypeBusiness.singleton = this;
    }

    // Return singleton.
    return GatewayTypeBusiness.singleton;
  }

  /**
   * Get gateway types.
   * @returns {Promise<GatewayTypeEntity[]>}
   */
  async getAll() {
    return await models.gatewayType.getAll();
  }
}

module.exports = GatewayTypeBusiness;
