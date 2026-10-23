import { AccessProvider } from './provider';

// Constants.
const PROVIDER_NAME = 'user-ip';

/**
 * User IP access provider.
 */
export class UserIpAccessProvider extends AccessProvider {
  config: any;

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

    // Define resolved client IP (honours Express `trust proxy`, never the raw `X-Forwarded-For` header).
    const requestIp = this.getRequestIp(req);

    // Check if client IP is not resolved.
    if (!requestIp) {
      return false;
    }

    // Match IP patterns.
    for (const userIpPattern of userMergedIpList) {
      if (this.matchIpPattern(requestIp, userIpPattern)) {
        return true;
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
    const requestIpParts = requestIp.split('.').map((v) => parseInt(v)); // Sample: `[10, 10, 5, 109]`.
    const userIpPatternParts = userIpPattern.split(/[.-]/).map((v) => parseInt(v)); // Samples: `[10, 10, 5, 109]`, `[10, 10, 5, 109, 110]`.

    // Check IP match pattern.
    return (
      requestIpParts[0] === userIpPatternParts[0] &&
      requestIpParts[1] === userIpPatternParts[1] &&
      requestIpParts[2] === userIpPatternParts[2] &&
      requestIpParts[3] >= userIpPatternParts[3] &&
      requestIpParts[3] <= (userIpPatternParts[4] || userIpPatternParts[3])
    );
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
   * Get request client IP.
   * Uses `req.ip`, which Express resolves from the socket address and `X-Forwarded-For` only through hops
   * allowed by the `server.trustProxy` setting. Client-supplied header entries are never trusted on their own.
   * @private
   * @param {object} req HTTP request.
   * @returns {string|undefined} Request client IP, sample: `10.10.5.109`.
   */
  getRequestIp(req) {
    const ip = req.ip || (req.socket || req.connection || {}).remoteAddress;
    return ip
      ? String(ip)
          .trim()
          .replace(/^::ffff:/i, '')
      : undefined;
  }
}
