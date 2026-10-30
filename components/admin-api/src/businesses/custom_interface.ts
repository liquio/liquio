import { getModels } from '../lib/context';

/**
 * Custom interface business.
 */
export class CustomInterfaceBusiness {
  private static singleton: CustomInterfaceBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
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
    return await getModels().customInterface.create(customInterface);
  }

  /**
   * Get custom interfaces.
   * @returns {Promise<CustomInterfaceEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    return await getModels().customInterface.getAll({ currentPage, perPage, filters, sort });
  }

  /**
   * Delete custom interface by ID.
   * @param {number} id Custom interface ID.
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async deleteById(id) {
    return await getModels().customInterface.deleteById(id);
  }

  /**
   * Find Custom interface by ID.
   * @param {number} id Custom interface ID.
   * @returns {Promise<CustomInterfaceEntity>}
   */
  async findById(id) {
    return await getModels().customInterface.findById(id);
  }
}
