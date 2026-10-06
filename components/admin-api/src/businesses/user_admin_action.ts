import { IdApiClient, getIdApiClient } from '@liquio/back-core';

/**
 * Delete history business.
 * @typedef {import('@liquio/back-core').IdApiUserAdminAction} UserAdminActionEntity
 */
export class UserAdminActionBusiness {
  private static singleton: UserAdminActionBusiness;

  public config: object;
  public idApiClient: IdApiClient;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!UserAdminActionBusiness.singleton) {
      // Init params.
      this.config = config;
      this.idApiClient = getIdApiClient();

      // Define singleton.
      UserAdminActionBusiness.singleton = this;
    }

    // Return singleton.
    return UserAdminActionBusiness.singleton;
  }

  /**
   * Get list.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: UserAdminActionEntity[], meta: {count: number, offset: number, limit: number}}>} User admin actions.
   */
  async getList(options) {
    return this.idApiClient.getUserAdminActions(options);
  }
}
