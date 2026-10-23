import { IdApiClient, getIdApiClient } from '@liquio/back-core';

/**
 * Login history business.
 * @typedef {import('@liquio/back-core').IdApiLoginHistoryEntry} LoginHistoryEntity
 */
export class LoginHistoryBusiness {
  private static singleton: LoginHistoryBusiness;

  public config: object;
  public idApiClient: IdApiClient;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!LoginHistoryBusiness.singleton) {
      // Init params.
      this.config = config;
      this.idApiClient = getIdApiClient();

      // Define singleton.
      LoginHistoryBusiness.singleton = this;
    }

    // Return singleton.
    return LoginHistoryBusiness.singleton;
  }

  /**
   * Get list.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: LoginHistoryEntity[], meta: {count: number, offset: number, limit: number}}>} Login history.
   */
  async getList(options) {
    return this.idApiClient.getLoginHistory(options);
  }
}
