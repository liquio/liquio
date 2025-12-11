/**
 * Access history business.
 */
class AccessHistoryBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AccessHistoryBusiness.singleton) {
      this.config = config;
      AccessHistoryBusiness.singleton = this;
    }

    // Return singleton.
    return AccessHistoryBusiness.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<object[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    return await models.accessHistory.getAll({ currentPage, perPage, filters, sort });
  }
}

module.exports = AccessHistoryBusiness;
