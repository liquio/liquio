import { AccessHistoryEntity } from '../entities/access_history';

/**
 * Access history business.
 */
export class AccessHistoryBusiness {
  static singleton: AccessHistoryBusiness;
  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?: object) {
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
   */
  async getAll({ currentPage, perPage, filters, sort }): Promise<AccessHistoryEntity[]> {
    return await global.models.accessHistory.getAll({ currentPage, perPage, filters, sort });
  }
}
