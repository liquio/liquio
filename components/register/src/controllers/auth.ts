import { NextFunction } from 'express';
import { appendTraceMeta, Log } from '@liquio/back-core';

import { Request, Response } from '../router';
import Controller from './controller';
import { resolveCallerAccess } from '../lib/caller_access';

const ACCESS_INFO_MAX_HEADER_LENGTH = 4096;
const ACCESS_INFO_MAX_KEYS = 20;
const ACCESS_INFO_MAX_KEY_LENGTH = 64;
const ACCESS_INFO_MAX_VALUE_LENGTH = 512;
const ACCESS_INFO_FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype', 'assertedBy'];

/**
 * Decode and sanitize the `access-info` header (base64 JSON object).
 * Keeps only scalar values with bounded sizes. Returns null when the header is malformed or too large.
 */
export function parseAccessInfoHeader(header: string | string[]): Record<string, string | number | boolean | null> | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string' || value.length > ACCESS_INFO_MAX_HEADER_LENGTH) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, v] of Object.entries(parsed)) {
    if (Object.keys(result).length >= ACCESS_INFO_MAX_KEYS) break;
    if (key.length > ACCESS_INFO_MAX_KEY_LENGTH || ACCESS_INFO_FORBIDDEN_KEYS.includes(key)) continue;
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) {
      result[key] = v as any;
    } else if (typeof v === 'string' && v.length <= ACCESS_INFO_MAX_VALUE_LENGTH) {
      result[key] = v;
    }
  }
  return result;
}

/**
 * Auth controller.
 */
export default class AuthController extends Controller {
  static singleton: AuthController;
  log: Log;

  /**
   * Auth controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: object) {
    // Define singleton.
    if (!AuthController.singleton) {
      super(config);
      this.log = Log.getInstance();
      AuthController.singleton = this;
    }
    return AuthController.singleton;
  }

  /**
   * Basic auth.
   */
  basicAuth(req: Request, res: Response, next: NextFunction) {
    // Define params.
    const { token: oldAuthorization, authorization, 'access-info': accessInfoBase64 } = req.headers;
    const token = authorization || oldAuthorization;
    const availableTokens = this.config.auth.tokens;

    // Check token in config.
    const isCorrectToken = availableTokens.includes(token);
    if (!isCorrectToken) {
      return this.responseError(res, 'Unknown basic auth token.', 401);
    }

    // Check token parts.
    const tokenParts = Array.isArray(token) ? token[0].split(' ') : token.split(' ');
    const [basicKeyword, base64TokenPart] = tokenParts;
    if (basicKeyword !== 'Basic') {
      return this.responseError(res, 'Wrong auth type.', 401);
    }

    // Parse token.
    const parsedTokenParts = Buffer.from(base64TokenPart, 'base64').toString('utf8').split(':');
    if (parsedTokenParts.length !== 2) {
      return this.responseError(res, 'Incorrect basic auth token.', 401);
    }

    // Get user.
    const [user] = parsedTokenParts;
    req.auth = { user };

    // Define access info. It is an unverified assertion of the human identity, honoured only from trusted callers.
    if (accessInfoBase64 !== undefined) {
      let trusted: boolean;
      try {
        trusted = resolveCallerAccess(req, this.config).trusted;
      } catch (error) {
        this.log.save('access-info-config-error', { message: error.message }, 'error');
        return this.responseError(res, 'Server auth configuration error.', 500);
      }

      if (!trusted) {
        this.log.save('access-info-ignored', { user, reason: 'untrusted-caller' }, 'warn');
      } else {
        const accessInfo = parseAccessInfoHeader(accessInfoBase64);
        if (accessInfo === null) {
          return this.responseError(res, 'Invalid access-info header.', 400);
        }
        if (Object.keys(accessInfo).length > 0) {
          // Record which authenticated service asserted the identity.
          const assertedAccessInfo = { ...accessInfo, assertedBy: user };
          this.log.save('access-info', assertedAccessInfo);
          req.accessInfo = assertedAccessInfo;

          // Append trace meta.
          appendTraceMeta({ accessInfo: assertedAccessInfo });
        }
      }
    }

    const limitedAccess = this.config.auth.limitedAccess || [];
    const userLimitedAccess = limitedAccess.find((v) => v.user === user);

    // Check limited access.
    if (userLimitedAccess) {
      const method = req.method;
      const url = req.url.split('?')[0];
      if (method !== 'GET' || url !== '/records') {
        return this.responseError(res, "Basic auth user don't have access to this URL.", 401, {
          method,
          url,
        });
      }
      const userLimitedAccessKeys = userLimitedAccess.keys || [];
      req.auth.userLimitedAccessKeys = userLimitedAccessKeys;
      if (!userLimitedAccessKeys.map((v) => `${v}`).includes(req.query.key_id)) {
        return this.responseError(res, "Basic auth user don't have access to this key.", 401, {
          requestedKey: req.query.key_id,
          userLimitedAccessKeys,
        });
      }
    }

    // Check raw filter access.
    if (req.body?.rawSequelizeParams && !this.config.auth?.allowRawSequelizeParamsUsers?.includes(user)) {
      return this.responseError(res, "User doesn't have access to use rawSequelizeParams param.", 400);
    }

    appendTraceMeta({ user });

    // Go next in other cases.
    next();
  }
}
