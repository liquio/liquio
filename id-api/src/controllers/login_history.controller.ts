import { Op, QueryOptions, WhereOptions } from 'sequelize';
import { matchedData, query } from 'express-validator';

import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

/**
 * Login history controller.
 */
export class LoginHistoryController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'loginHistory');
  }

  protected registerRoutes() {
    this.router.get(
      '/login_history',
      [
        // .default() doesn't work
        // https://github.com/express-validator/express-validator/issues/1057
        query('offset').optional().isNumeric(),
        query('limit').optional().isNumeric(),
        query('filter').optional().isJSON(),
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
    const { offset = 0, limit = 10, filter: queryFilter } = matchedData(req, { locations: ['query'] });
    const {
      created_at_from: createdAtFrom,
      created_at_to: createdAtTo,
      user_id: userId,
      user_name: userName,
      ip,
      user_agent: userAgent,
      client_id: clientId,
      client_name: clientName,
      is_blocked: isBlocked,
      action_type: actionType,
    } = queryFilter ? JSON.parse(queryFilter) : {};

    const clientIdAsOneRecord = typeof clientId === 'string' && !clientId.includes(',') ? clientId : undefined;
    const clientIdAsRecordsArray = typeof clientId === 'string' && clientId.includes(',') ? clientId.split(',').filter((v) => !!v) : undefined;

    const conditions: any[] = [];
    if (createdAtFrom) {
      conditions.push({ created_at: { [Op.gte]: createdAtFrom } });
    }
    if (createdAtTo) {
      conditions.push({ created_at: { [Op.lte]: createdAtTo } });
    }
    if (userId) {
      conditions.push({ user_id: userId });
    }
    if (userName) {
      conditions.push({ user_name: { [Op.iLike]: `%${userName}%` } });
    }
    if (ip) {
      conditions.push({ ip: { [Op.contains]: [ip] } });
    }
    if (userAgent) {
      conditions.push({ user_agent: { [Op.iLike]: `%${userAgent}%` } });
    }
    if (clientIdAsOneRecord) {
      conditions.push({ client_id: clientIdAsOneRecord });
    }
    if (clientIdAsRecordsArray) {
      conditions.push({ client_id: { [Op.in]: clientIdAsRecordsArray } });
    }
    if (clientName) {
      conditions.push({ client_name: { [Op.iLike]: `%${clientName}%` } });
    }
    if (isBlocked) {
      conditions.push({ is_blocked: isBlocked === 'true' });
    }
    if (actionType) {
      conditions.push({ action_type: actionType });
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
    const queryOptions = { where: filter, order, offset: queryOffset, limit: queryLimit } as QueryOptions;

    // Do DB query.
    const dbResponse = await this.model('loginHistory').findAndCountAll(queryOptions);
    const { rows, count } = dbResponse;

    const accessTokenLifetimeInMilliseconds = this.service('auth').accessTokenLifetime * 1000;
    const rowsWithExpiresAt = rows.map((el: any) => ({
      ...el.dataValues,
      expires_at: el.action_type === 'login' ? new Date(Number(el.created_at) + accessTokenLifetimeInMilliseconds) : null,
    }));

    // Return list
    res.send({ data: rowsWithExpiresAt, meta: { count, offset: queryOffset, limit: queryLimit } });
  }
}
