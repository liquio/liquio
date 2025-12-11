const KycSessionModel = require('../../models/kyc_session');
const { StripeProvider } = require('./providers/stripe');
const { BadRequestError, NotFoundError } = require('../../lib/errors');

/**
 * KYC service.
 */
class KycService {
  constructor() {
    if (!KycService.singleton) {
      this.config = global.config.kyc || {};

      this.providers = {
        stripe: this.config.stripe?.isEnabled ? new StripeProvider(this.config.stripe) : null,
      };

      // Test provider connections.
      for (const provider in this.providers) {
        if (this.providers[provider]) {
          this.providers[provider].testConnection().then((success) => {
            global.log.save('kyc-service|test', { provider, success });
          });
        }
      }

      const { model: kycSessionModel } = new KycSessionModel();
      this.kycSessionModel = kycSessionModel;

      KycService.singleton = this;
    }

    return KycService.singleton;
  }

  /**
   * @private
   * @param {string} name Provider name
   * @returns {KycProvider}
   */
  getProvider(name) {
    const provider = this.providers[name];
    if (provider === undefined) {
      throw new BadRequestError(`Invalid provider: ${name}`);
    } else if (provider === null) {
      throw new BadRequestError(`Provider not configured: ${name}`);
    }
    return provider;
  }

  /**
   * Create a KYC session for the user.
   * @param {string} provider Provider name
   * @param {string} userId User ID
   * @param {string} returnUrl Return URL
   * @returns {object}
   */
  async createSession(provider, userId, returnUrl) {
    if (!userId) {
      throw new BadRequestError('Invalid user');
    }

    if (!returnUrl) {
      throw new BadRequestError('Invalid return URL');
    }

    const { sessionId, redirectUrl, data } = await this.getProvider(provider).createSession(userId, returnUrl);

    global.log.save('kyc-service|create-session', { provider, userId, sessionId, returnUrl, redirectUrl, data });

    const session = await this.kycSessionModel.create({
      provider,
      sessionId,
      userId,
      redirectUrl,
      returnUrl,
      status: 'pending',
      data,
    });

    return session;
  }

  /**
   * Update an existing KYC session for the user.
   * @param {string} provider Provider name
   * @param {string} userId User ID
   * @param {string} id Internal session ID
   * @returns {object}
   */
  async updateSession(provider, userId, id) {
    if (!userId) {
      throw new BadRequestError('Invalid user');
    }

    if (!id) {
      throw new BadRequestError('Invalid session ID');
    }

    const existingSession = await this.kycSessionModel.findOne({ where: { id, provider } });
    if (!existingSession) {
      throw new NotFoundError('Session not found');
    }

    if (existingSession.userId !== userId) {
      throw new NotFoundError('Session not found');
    }

    let { data, status } = await this.getProvider(provider).getSession(existingSession.sessionId);

    if (['pending', 'waiting', 'verified', 'canceled', 'failed'].indexOf(status) === -1) {
      global.log.save('kyc-service|update-session-unknown-status', { provider, userId, id, status }, 'error');
      status = 'failed';
    }

    global.log.save('kyc-service|update-session', { provider, userId, id, status, data });

    const [, [session]] = await this.kycSessionModel.update({ status, data }, { where: { id: existingSession.id }, returning: true });

    return session;
  }

  /**
   * Get data for an existing KYC session
   * @param {string} provider Provider name
   * @param {string} userId User ID
   * @param {string} id Internal session ID
   * @returns {object}
   */
  async getSession(provider, userId, id) {
    if (!userId) {
      throw new BadRequestError('Invalid user');
    }

    if (!id) {
      throw new BadRequestError('Invalid session ID');
    }

    const session = await this.kycSessionModel.findOne({ where: { id, provider } });
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundError('Session not found');
    }

    return session;
  }
}

module.exports = { KycService };
