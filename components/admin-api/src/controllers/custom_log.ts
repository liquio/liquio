import { matchedData } from 'express-validator';

import { Controller } from './controller';
import { CustomLogBusiness } from '../businesses/custom_log';

/**
 * Custom log controller.
 */
export class CustomLogController extends Controller {
  private static singleton: CustomLogController;

  private customLogBusiness: CustomLogBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!CustomLogController.singleton) {
      super(config);
      this.customLogBusiness = new CustomLogBusiness();
      CustomLogController.singleton = this;
    }
    return CustomLogController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const { page: currentPage, count: perPage, isAppendCustomFields = false } = queryData;

    let customLogs;
    try {
      customLogs = await this.customLogBusiness.getAll({
        currentPage,
        perPage,
        sort: sort,
        filters: filters,
        isAppendCustomFields,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, customLogs, true);
  }
}
