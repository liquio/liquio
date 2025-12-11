/**
 * Custom interface business.
 */
class CustomInterfaceBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!CustomInterfaceBusiness.singleton) {
      this.config = config;
      CustomInterfaceBusiness.singleton = this;
    }

    // Return singleton.
    return CustomInterfaceBusiness.singleton;
  }

  /**
   * Create or update custom interface.
   * @param {CustomInterfaceEntity} customInterface Custom interface Entity.
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async createOrUpdate(customInterface) {
    return await models.customInterface.create(customInterface);
  }

  /**
   * Get custom interfaces.
   * @returns {Promise<CustomInterfaceEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    return await models.customInterface.getAll({ currentPage, perPage, filters, sort });
  }

  /**
   * Delete custom interface by ID.
   * @param {number} id Custom interface ID.
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async deleteById(id) {
    return await models.customInterface.deleteById(id);
  }

  /**
   * Find Custom interface by ID.
   * @param {number} id Custom interface ID.
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async findById(id) {
    return await models.customInterface.findById(id);
  }
}

module.exports = CustomInterfaceBusiness;
