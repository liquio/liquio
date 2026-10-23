/**
 * Helpers that reduce objects to a log-safe shape (identifiers and counts only, no PII).
 */

const USER_LOG_KEYS = ['userId', 'remoteAddress', 'xForwardedFor', 'userAgent'];
const UNIT_PII_KEYS = ['headsIpn', 'membersIpn', 'requestedMembers', 'allowTokens'];

/**
 * Reduce a user/initiator object to identifiers safe for logs.
 * @param {object|string} [user] User object (request user base info, person etc.).
 * @returns {object|undefined} Log-safe user.
 */
export function toLogUser(user?: any): any {
  if (!user || typeof user !== 'object') {
    return user === undefined || user === null ? undefined : { userId: user };
  }
  const result: any = {};
  for (const key of USER_LOG_KEYS) {
    if (user[key] !== undefined && user[key] !== null) {
      result[key] = user[key];
    }
  }
  return result;
}

/**
 * Reduce a unit (or array of units) to a log-safe shape: IPN lists, requested members and tokens become counts.
 * @param {object|object[]} [unit] Unit entity or list.
 * @returns {object|object[]|undefined} Log-safe unit.
 */
export function toLogUnit(unit?: any): any {
  if (Array.isArray(unit)) {
    return unit.map(toLogUnit);
  }
  if (!unit || typeof unit !== 'object') {
    return unit;
  }
  const result: any = { ...unit };
  for (const key of UNIT_PII_KEYS) {
    if (key in result) {
      result[`${key}Count`] = Array.isArray(result[key]) ? result[key].length : 0;
      delete result[key];
    }
  }
  return result;
}

/**
 * Count items of a list for logs.
 * @param {any[]} [list] List.
 * @returns {number} Count.
 */
export function countOf(list?: any[]): number {
  return Array.isArray(list) ? list.length : 0;
}
