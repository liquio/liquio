/**
 * Gateway type business.
 */
export class GatewayTypeBusiness {
  private static singleton: GatewayTypeBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
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
    return await global.models.gatewayType.getAll();
  }
}
