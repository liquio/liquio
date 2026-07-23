
import { Controller } from './controller';

/**
 * UI Filter controller.
 */
export class UIFilterController extends Controller {
  private static singleton: UIFilterController;

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
      uiFilters = await global.models.uiFilter.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, uiFilters);
  }
}

