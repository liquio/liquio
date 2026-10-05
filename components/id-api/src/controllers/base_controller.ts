import debug from 'debug';
import { validationResult } from 'express-validator';
import { Log, getTraceId } from '@liquio/back-core';

import { Errors } from '../lib/errors';
import { AuthMiddleware } from '../middleware/authenticate';
import { LoginActionType, Models } from '../models';
import { Services } from '../services';
import { Express, HttpStatusCode, NextFunction, Request, Response, Router } from '../types';

const EMPTY_DATA = {};

export enum ControllerErrorMessage {
  SERVER_ERROR = 'Server error.',
  INTERNAL = 'Internal error.',
  INVALID_USER_ID = 'Invalid user ID.',
}

/**
 * Base controller class.
 */
export class BaseController {
  protected log = Log.getInstance();
  protected config: any;
  protected startTime?: Date;
  protected debug: debug.Debugger;

  constructor(
    protected router: Router,
    protected app: Express,
    protected name: string,
  ) {
    this.config = app.config;
    this.debug = debug(`app:controller:${this.name}`);
  }

  get auth(): AuthMiddleware {
    return AuthMiddleware.get();
  }

  get model() {
    return Models.model.bind(Models);
  }

  get service() {
    return Services.service.bind(Services);
  }

  protected registerRoutes() {
    throw new Error('Method not implemented.');
  }

  handleValidation(req: Request, res: Response, next: NextFunction) {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    // Log error.
    this.log.save('validation-error', { errors: result.array() }, 'error');

    res.status(400).json({
      message: Errors.List.VALIDATION_ERROR.message,
      code: Errors.List.VALIDATION_ERROR.code,
      details: result.array(),
    });
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res: Response, data = EMPTY_DATA, httpStatusCode: number = HttpStatusCode.Ok) {
    // Response.
    res.status(httpStatusCode).send(data);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseError(res: Response, error: any = ControllerErrorMessage.SERVER_ERROR, httpStatusCode: number = HttpStatusCode.InternalServerError) {
    // Define params.
    const message = error instanceof Error ? error.message : error;
    const errorFromList = Errors.getByMessage(message);
    const errorFromListCode = errorFromList?.code;

    // Response.
    res.status(httpStatusCode).send({
      message,
      code: errorFromListCode,
      traceId: getTraceId(),
    });
  }

  /**
   * Prepare login history data.
   */
  prepareLoginHistoryData(req: Request, { actionType = 'login' }: { actionType?: LoginActionType }) {
    const ip = [req.headers['x-forwarded-for'] || req.socket?.remoteAddress];
    const userAgent = req.headers['user-agent'] ?? null;
    const { userId, first_name: firstName, middle_name: middleName, last_name: lastName, isActive: isUserActive = true } = req.user || {};
    const userName = [lastName, firstName, middleName].filter((v) => !!v).join(' ');
    const { clientId, client_name: clientName } = req.session.client ?? {};

    // Check if user not defined.
    if (!userId) {
      return;
    }

    return {
      user_id: userId,
      user_name: userName,
      ip,
      user_agent: userAgent,
      client_id: clientId ?? 'undefined',
      client_name: clientName,
      is_blocked: !isUserActive,
      action_type: actionType,
    };
  }
}
