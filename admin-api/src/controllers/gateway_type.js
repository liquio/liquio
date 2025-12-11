const Controller = require('./controller');
const GatewayTypeBusiness = require('../businesses/gateway_type');

/**
 * Gateway type controller.
 */
class GatewayTypeController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!GatewayTypeController.singleton) {
      super(config);
      this.gatewayTypeBusiness = new GatewayTypeBusiness();
      GatewayTypeController.singleton = this;
    }
    return GatewayTypeController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let gatewayTypes;
    try {
      gatewayTypes = await this.gatewayTypeBusiness.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, gatewayTypes);
  }
}

module.exports = GatewayTypeController;
