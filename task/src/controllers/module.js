
const Controller = require('./controller');

/**
 * Module controller.
 */
class ModuleController extends Controller {
  /**
   * Module controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ModuleController.singleton) {
      super(config);
      this.config = config;
      ModuleController.singleton = this;
    }
    return ModuleController.singleton;
  }

  /**
   * Get modules.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getModules(req, res) {
    const responseData = this.config.modules;

    this.responseData(res, responseData);
  }
}

module.exports = ModuleController;
