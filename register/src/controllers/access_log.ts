import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import AccessLogModel from '../models/access_log';

/**
 * Access log controller.
 */
export default class AccessLogController extends Controller {
  static singleton: AccessLogController;

  accessLogModel: AccessLogModel;

  /**
   * Access log controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: object) {
    // Define singleton.
    if (!AccessLogController.singleton) {
      super(config);
      this.accessLogModel = AccessLogModel.getInstance();
      AccessLogController.singleton = this;
    }
    return AccessLogController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req: Request, res: Response) {
    // Define params.
    const {
      offset,
      limit,
      key_id: keyId,
      record_id: recordId,
      created_from: createdFrom,
      created_to: createdTo
    } = {
      offset: 0,
      limit: 5,
      ...(matchedData(req, { locations: ['query'] }) as any)
    };
    const filter: { key_id?: number; record_id?: string; created_from?: string; created_to?: string } = {};
    if (keyId) filter.key_id = keyId;
    if (recordId) filter.record_id = recordId;
    if (createdFrom) filter.created_from = createdFrom;
    if (createdTo) filter.created_to = createdTo;

    // Get access log.
    let accessLogModelResponse;
    try {
      accessLogModelResponse = await this.accessLogModel.getAll({
        offset: offset,
        limit: Math.min(limit, this.config.pagination.maxLimit),
        filter
      });
    } catch (error) {
      this.log.save('get-access-log-error', { error: error && error.message });
    }
    const { data: accessLog = [], meta } = accessLogModelResponse || {};

    // Response.
    this.responseData(res, accessLog, meta);
  }
}
