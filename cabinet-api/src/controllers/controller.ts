import _ from 'lodash';
import type { Response } from 'express';

import { getTraceId } from '../lib/async_local_storage';
import type UnitEntity from '../entities/unit';

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const DEFAULT_ERROR_MESSAGE = 'Server error.';
const EMPTY_DATA: any = null;

/**
 * Controller.
 */
export default class Controller {
  config: Record<string, unknown>;

  /**
   * Controller constructor.
   * @param {object} [config] Config object.
   */
  constructor(config: Record<string, unknown> = {}) {
    this.config = config;
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {boolean} [isRawResponse] Is RAW response indicator. Do not pack response inside `data` object if equals `true`.
   */
  responseData(res: Response, data: unknown = EMPTY_DATA, httpStatusCode: number = HTTP_STATUS_CODE_OK, isRawResponse: boolean = false): void {
    // Define response object.
    const responseObject = isRawResponse ? data : { data };

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {any} [details] Details.
   */
  responseError(
    res: Response,
    error: string | Error | null = DEFAULT_ERROR_MESSAGE,
    httpStatusCode: number = HTTP_STATUS_CODE_SERVER_ERROR,
    details?: unknown,
  ): void {
    // Define params.
    const message = (error && (error as Error).message) || error;
    const code = (error && (error as any).code) || undefined;

    // Define response object.
    const responseObject = { error: { message, details, code }, traceId: getTraceId() };

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Get request user info.
   * @param {object} req HTTP request.
   * @returns {object}
   */
  getRequestUserInfo(req: any): Record<string, unknown> | null {
    return req && req.authUserInfo;
  }

  /**
   * Get request user ID.
   * @param {object} req HTTP request.
   * @returns {string} Request user ID.
   */
  getRequestUserId(req: any): string | null {
    return req && req.authUserInfo && req.authUserInfo.userId;
  }

  /**
   * Get request external user.
   * @param {object} req HTTP request.
   * @returns {string} Request external user.
   */
  getRequestExternalUser(req: any): string | null {
    return req && req.basicAuthUser;
  }

  /**
   * Get request user roles.
   * @param {object} req HTTP request.
   * @returns {string[]} Roles.
   */
  getRequestUserRoles(req: any): string[] | null {
    return req && req.authUserRoles;
  }

  /**
   * Get request user unit entities.
   * @param {object} req HTTP request.
   * @returns {{head: UnitEntity[], member: UnitEntity[], all: UnitEntity[]}} Unit entities.
   */
  getRequestUserUnitEntities(req: any): { head: UnitEntity[]; member: UnitEntity[]; all: UnitEntity[] } | null {
    return req && req.authUserUnitEntities;
  }

  /**
   * Get request user units.
   * @param {object} req HTTP request.
   * @returns {{head: string[], member: string[], all: string[]}} Unit names.
   */
  getRequestUserUnits(req: any): { head: string[]; member: string[]; all: string[] } {
    const units = this.getRequestUserUnitEntities(req);
    const { head, member, all } = units || { head: [], member: [], all: [] };
    return {
      head: head.map((v) => v.name),
      member: member.map((v) => v.name),
      all: all.map((v) => v.name),
    };
  }

  /**
   * Get request user unit IDs.
   * @param {object} req HTTP request.
   * @returns {{head: number[], member: number[], all: number[]}} Unit IDs.
   */
  getRequestUserUnitIds(req: any): { head: number[]; member: number[]; all: number[] } {
    const units = this.getRequestUserUnitEntities(req);
    const { head, member, all } = units || { head: [], member: [], all: [] };
    return {
      head: head.map((v) => v.id),
      member: member.map((v) => v.id),
      all: all.map((v) => v.id),
    };
  }

  /**
   * Get request user unit head.
   * @param {object} req HTTP request.
   * @param {number} unitId Unit ID.
   * @returns {boolean} Is request user unit head indicator.
   */
  isRequestUserUnitHead(req: any, unitId: number): boolean {
    const { head: headUnitIds = [] } = this.getRequestUserUnitIds(req);
    return headUnitIds.includes(unitId);
  }

  /**
   * Get request user unit allow tokens.
   * @param {object} req HTTP request.
   * @returns {{allowTokens: string[]}} Allow Tokens.
   */
  getRequestUserUnitAllowTokens(req: any): string[] {
    const units = this.getRequestUserUnitEntities(req);
    const { all }: any = units || { all: [] };

    return [...new Set(_.flattenDeep(all.map((v: any) => v.allowTokens)))];
  }

  /**
   * Get request user EDS.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserEds(req: any): string | null {
    return req && req.authUserInfo && req.authUserInfo.services && req.authUserInfo.services.eds;
  }

  /**
   * Get request user EDS PEM.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserEdsPem(req: any): string | null {
    return (
      req &&
      req.authUserInfo &&
      req.authUserInfo.services &&
      req.authUserInfo.services.eds &&
      req.authUserInfo.services.eds.data &&
      req.authUserInfo.services.eds.data.pem
    );
  }

  /**
   * Get request user access token.
   * @param {object} req HTTP request.
   * @returns {string}
   */
  getRequestUserAccessToken(req: any): string | null {
    return req && req.authAccessToken;
  }
}
