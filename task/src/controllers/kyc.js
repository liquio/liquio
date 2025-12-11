const Controller = require('./controller');
const { KycService } = require('../services/kyc');

/**
 * KYC controller.
 */
class KycController extends Controller {
  constructor() {
    if (!KycController.singleton) {
      super();
      this.service = new KycService();
      KycController.singleton = this;
    }
    return KycController.singleton;
  }

  /**
   * Create a new KYC session for the user.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createSession(req, res) {
    const userId = this.getRequestUserId(req);

    const { provider } = req.params;
    if (!provider) {
      return this.responseError(res, 'Missing provider', 400);
    }

    const { returnUrl } = req.body;
    if (!returnUrl) {
      return this.responseError(res, 'Missing returnUrl', 400);
    }

    try {
      const result = await this.service.createSession(provider, userId, returnUrl);
      this.responseData(res, result);
    } catch (error) {
      global.log.save('kyc-create-session-error', { error: error && error.message, provider, userId, returnUrl }, 'error');
      this.responseError(res, 'Unable to create a session', 503);
    }
  }

  /**
   * Request the session status from the KYC provider and save it.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateSession(req, res) {
    const userId = this.getRequestUserId(req);

    const { provider, id } = req.params;

    try {
      const result = await this.service.updateSession(provider, userId, id);
      this.responseData(res, result);
    } catch (error) {
      global.log.save('kyc-update-session-error', { error: error && error.message, provider, userId, id }, 'error');
      this.responseError(res, 'Unable to update the session', 503);
    }
  }

  /**
   * Get data for an existing KYC session.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getSession(req, res) {
    const userId = this.getRequestUserId(req);

    const { provider, id } = req.params;

    try {
      const result = await this.service.getSession(provider, userId, id);
      this.responseData(res, result);
    } catch (error) {
      global.log.save('kyc-get-session-error', { error: error && error.message, provider, userId, id }, 'error');
      this.responseError(res, 'Unable to get the session', 503);
    }
  }
}

module.exports = KycController;
