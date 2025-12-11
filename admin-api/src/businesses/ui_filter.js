/**
 * UI Filter business.
 */
class UIFilterBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
    return await models.uiFilter.create(uiFilter);
  }

  /**
   * Get ui filters.
   * @returns {Promise<UIFilterEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    return await models.uiFilter.getAll({ currentPage, perPage, filters, sort });
  }

  /**
   * Delete ui filter by ID.
   * @param {number} id UI Filter ID.
   * @returns {Promise<UIFilterEntity>}
   */
  async deleteById(id) {
    return await models.uiFilter.deleteById(id);
  }

  /**
   * Find UI Filter by ID.
   * @param {number} id UI Filter ID.
   * @returns {Promise<UIFilterEntity>}
   */
  async findById(id) {
    return await models.uiFilter.findById(id);
  }
}

module.exports = UIFilterBusiness;
