import { getModels } from '../lib/context';

/**
 * UI Filter business.
 */
export class UIFilterBusiness {
  static singleton: UIFilterBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
    // Define singleton.
    if (!UIFilterBusiness.singleton) {
      this.config = config;
      UIFilterBusiness.singleton = this;
    }

    // Return singleton.
    return UIFilterBusiness.singleton;
  }

  /**
   * Create or update ui filter.
   * @param {UIFilterEntity} uiFilter UI Filter Entity.
   * @returns {Promise<UIFilterEntity>}
   */
  async createOrUpdate(uiFilter) {
    return await getModels().uiFilter.create(uiFilter);
  }

  /**
   * Get ui filters.
   * @returns {Promise<UIFilterEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    return await getModels().uiFilter.getAll({ currentPage, perPage, filters, sort });
  }

  /**
   * Delete ui filter by ID.
   * @param {number} id UI Filter ID.
   * @returns {Promise<UIFilterEntity>}
   */
  async deleteById(id) {
    return await getModels().uiFilter.deleteById(id);
  }

  /**
   * Find UI Filter by ID.
   * @param {number} id UI Filter ID.
   * @returns {Promise<UIFilterEntity>}
   */
  async findById(id) {
    return await getModels().uiFilter.findById(id);
  }
}
