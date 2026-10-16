import { Op, QueryOptions, WhereOptions } from 'sequelize';
import { matchedData, query } from 'express-validator';

import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

const DEFAULT_MAX_LIMIT = 100;
const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Filters that narrow the result to a subject, so a scoped client can't page through everyone's history.
const NARROWING_FILTER_KEYS = ['user_id', 'user_name', 'ip', 'client_id', 'client_name', 'created_at_from'];

const ALLOWED_FILTER_KEYS = [
  'created_at_from',
  'created_at_to',
  'user_id',
  'user_name',
  'ip',
  'user_agent',
  'client_id',
  'client_name',
  'is_blocked',
  'action_type',
];

/**
 * Parse and validate the filter query parameter.
 * Accepts either an object (bracket notation, e.g. filter[user_id]=x) or a JSON string.
 * Throws on invalid input or unknown filter keys.
 */
function parseFilter(value: unknown): Record<string, string> {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid filter format');
  }
  const unknownKeys = Object.keys(parsed).filter((key) => !ALLOWED_FILTER_KEYS.includes(key));
  if (unknownKeys.length) {
    throw new Error(`Invalid filter keys: ${unknownKeys.join(', ')}`);
  }
  return parsed;
}

function omit(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
}

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
        query('offset').optional().isInt({ min: 0 }),
        query('limit').optional().isInt({ min: 1 }),
        query('filter')
          .optional()
          .custom((value) => {
            parseFilter(value);
            return true;
          }),
        this.handleValidation.bind(this),
      ],
      this.auth.basic('login_history'),
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
    } = queryFilter ? parseFilter(queryFilter) : {};

    // Named clients without `login_history:all` must narrow the query and get a default time window.
    // The legacy shared secret holds every scope, so its unfiltered listing keeps working.
    const scopes = req.serviceClient?.scopes ?? [];
    const canListAll = scopes.includes('login_history:all');
    const canSeePii = scopes.includes('login_history:pii');
    const parsedFilter: Record<string, string> = queryFilter ? parseFilter(queryFilter) : {};
    if (!canListAll && !NARROWING_FILTER_KEYS.some((key) => parsedFilter[key])) {
      res.status(400).send({ error: `Narrowing filter required: one of ${NARROWING_FILTER_KEYS.join(', ')}` });
      return;
    }

    const clientIdAsOneRecord = typeof clientId === 'string' && !clientId.includes(',') ? clientId : undefined;
    const clientIdAsRecordsArray = typeof clientId === 'string' && clientId.includes(',') ? clientId.split(',').filter((v) => !!v) : undefined;

    const conditions: any[] = [];
    if (createdAtFrom) {
      conditions.push({ created_at: { [Op.gte]: createdAtFrom } });
    } else if (!canListAll) {
      conditions.push({ created_at: { [Op.gte]: new Date(Date.now() - DEFAULT_WINDOW_MS) } });
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
    const requestedLimit = parseInt(limit.toString()) || 10;
    const maxLimit = req.serviceClient?.maxLimit ?? DEFAULT_MAX_LIMIT;
    const queryLimit = Math.min(Math.max(requestedLimit, 1), maxLimit);

    // Define DB query.
    const queryOptions = { where: filter, order, offset: queryOffset, limit: queryLimit } as QueryOptions;

    // Do DB query.
    const dbResponse = await this.model('loginHistory').findAndCountAll(queryOptions);
    const { rows, count } = dbResponse;

    const accessTokenLifetimeInMilliseconds = this.service('auth').accessTokenLifetime * 1000;
    const rowsWithExpiresAt = rows.map((el: any) => ({
      ...(canSeePii ? el.dataValues : omit(el.dataValues, ['user_agent', 'user_name'])),
      expires_at: el.action_type === 'login' ? new Date(Number(el.created_at) + accessTokenLifetimeInMilliseconds) : null,
    }));

    // Return list
    res.send({ data: rowsWithExpiresAt, meta: { count, offset: queryOffset, limit: queryLimit } });
  }
}
