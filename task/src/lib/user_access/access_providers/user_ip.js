
const AccessProvider = require('./provider');

// Constants.
const PROVIDER_NAME = 'user-ip';

/**
 * User IP access provider.
 */
class UserIpAccessProvider extends AccessProvider {
  /**
   * User IP access provider constructor.
   * @param config Config objects.
   */
  constructor(config = global.config) {
    super();

    // Define and save config.
    const { lists: ipList = {} } = config.ip || {}; // Sample of `ipList`: `{ office: ['10.10.5.108', '10.10.5.109-100'] }`.
    const { usersIpnToIpList = {} } = config.access || {}; // Sample of `usersIpnToIpList`: `{ '1111111111': ['office', 'home'] }`.
    this.config = { ipList, usersIpnToIpList };
  }

  /**
   * Name.
   * @returns {string} Provider name.
   */
  get name() {
    return PROVIDER_NAME;
  }

  /**
   * Check access.
   * @param {object} req HTTP request.
   * @returns {Promise<boolean>} Acces granted indicator promise.
   */
  async checkAccess(req) {
    // Define request params.
    const userIpn = this.getRequestUserIpn(req);

    // Check user access list.
    // Sample: `['office', 'home']`.
    const usersIpnToIpListRecord = this.config.usersIpnToIpList[userIpn];

    // Check if not need to verify.
    if (!usersIpnToIpListRecord) {
      return true;
    }

    // Define user marged IP list.
    // Sample: `['10.10.5.108', '10.10.5.109-100']`.
    const userMergedIpList = [...new Set(usersIpnToIpListRecord.reduce((t, v) => [...t, ...(this.config.ipList[v] || [])], []))];

    // Check if empty merged IP list.
    if (!userMergedIpList) {
      return false;
    }

    // Define request IP list.
    // Sample: `['127.0.0.1', '10.10.5.109']`.
    const requestIpList = this.getRequestIpList(req);

    // Check if empty request list.
    if (!requestIpList) {
      return false;
    }

    // Match IP patterns.
    for (const requestIp of requestIpList) {
      for (const userIpPattern of userMergedIpList) {
        const matchIpPattern = this.matchIpPattern(requestIp, userIpPattern);
        if (matchIpPattern) {
          return true;
        }
      }
    }

    // Not matched in other cases.
    return false;
  }

  /**
   * Match IP pattern.
   * @private
   * @param {string} requestIp Request IP, sample: `10.10.5.109`.
   * @param {string} userIpPattern User IP pattern, samples: `10.10.5.109`, `10.10.5.109-100`.
   * @returns {boolean} Requested IP matched with IP pattern indicator.
   */
  matchIpPattern(requestIp, userIpPattern) {
    // Parse request IP and user IP pattern.
    const requestIpParts = requestIp.split('.').map(v => parseInt(v)); // Sample: `[10, 10, 5, 109]`.
    const userIpPatternParts = userIpPattern.split(/[.-]/).map(v => parseInt(v)); // Samples: `[10, 10, 5, 109]`, `[10, 10, 5, 109, 110]`.

    // Check IP match pattern.
    return requestIpParts[0] === userIpPatternParts[0] &&
      requestIpParts[1] === userIpPatternParts[1] &&
      requestIpParts[2] === userIpPatternParts[2] &&
      requestIpParts[3] >= userIpPatternParts[3] &&
      requestIpParts[3] <= (userIpPatternParts[4] || userIpPatternParts[3]);
  }

  /**
   * Get request user IPN.
   * @private
   * @param {object} req HTTP request.
   * @returns {string} Request user IPN.
   */
  getRequestUserIpn(req) {
    // Define and return auth user IPN.
    return req && req.authUserInfo && req.authUserInfo.ipn;
  }

  /**
   * Get request IP list.
   * @private
   * @param {object} req HTTP request.
   * @returns {string[]} Request IP list.
   */
  getRequestIpList(req) {
    // Define remote address and request header `x-forwarded-for`.
    // Sample of remote address: `127.0.0.1`.
    // Sample of `x-forwarded-for` request header: `203.0.113.195, 70.41.3.18, 150.172.238.178`.
    const remoteAddress = req.connection.remoteAddress;
    const xForwardedForHeader = req.headers['x-forwarded-for'];

    // Define and return request IP list.
    // Sample: `['127.0.0.1', '203.0.113.195', '70.41.3.18', '150.172.238.178']`.
    return [...new Set([remoteAddress, ...((xForwardedForHeader || '').split(','))].filter(v => !!v).map(v => v.trim()))];
  }
}

module.exports = UserIpAccessProvider;
