import { matchedData, query } from 'express-validator';
import { Op, QueryOptions, WhereOptions } from 'sequelize';

import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

/**
 * User admin action controller.
 */
export class UserAdminActionController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'userAdminAction');
  }

  protected registerRoutes() {
    this.router.get(
      '/user_admin_actions',
      [
        query('offset').isNumeric().default(0),
        query('limit').isNumeric().default(10),
        query('filter').optional().isObject(),
        this.handleValidation.bind(this),
      ],
      this.auth.basic(),
      this.getList.bind(this),
    );
  }

  /**
   * Get list.
   */
  async getList(req: Request, res: Response): Promise<void> {
    // Define params.
    const { offset = 0, limit = 10, filter: requestFilter = {} } = matchedData(req, { locations: ['query'] });

    const {
      created_at_from: createdAtFrom,
      created_at_to: createdAtTo,
      action_type: actionType,
      initiator_id: initiatorId,
      user_id: userId,
    } = requestFilter;

    const conditions: any[] = [];
    if (createdAtFrom) {
      conditions.push({ created_at: { [Op.gte]: createdAtFrom } });
    }
    if (createdAtTo) {
      conditions.push({ created_at: { [Op.lte]: createdAtTo } });
    }
    if (actionType) {
      conditions.push({ action_type: actionType });
    }
    if (initiatorId) {
      conditions.push({ 'created_by.userId': initiatorId });
    }
    if (userId) {
      conditions.push({ user_id: userId });
    }

    // Prepare DB query filter.
    let filter: WhereOptions = { [Op.and]: conditions };

    // Prepare DB query sorting.
    const order = [
      ['created_at', 'desc'],
      ['id', 'desc'],
    ];

    // Prepare DB query pagination.
    const queryOffset = parseInt(offset.toString());
    const requestedLimit = parseInt(limit.toString());
    const queryLimit = Math.min(requestedLimit, 100);

    // Define DB query.
    const queryOptions = { where: filter, order, offset: queryOffset, limit: queryLimit };

    // Do DB query.
    const dbResponse = await this.model('userAdminAction').findAndCountAll(queryOptions as QueryOptions);
    const { rows, count } = dbResponse;

    // Return list,
    res.send({ data: rows, meta: { count, offset: queryOffset, limit: queryLimit } });
  }
}
