
const Controller = require('./controller');

/**
 * UI Filter controller.
 */
class UIFilterController extends Controller {
  /**
   * UI Filter controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UIFilterController.singleton) {
      super(config);
      UIFilterController.singleton = this;
    }
    return UIFilterController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Get ui filters.
    let uiFilters;
    try {
      uiFilters = await models.uiFilter.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, uiFilters);
  }
}

module.exports = UIFilterController;
