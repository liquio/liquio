
const Entity = require('./entity');

/**
 * KYC session entity.
 */
class KycSessionEntity extends Entity{
  /**
   * Constructor.
   * @param {object} options
   * @param {string} options.id Internal ID.
   * @param {string} options.provider Provider name.
   * @param {string} options.sessionId Provider session ID.
   * @param {string} options.userId User ID.
   * @param {string} options.redirectUrl Redirect URL.
   * @param {string} options.returnUrl Return URL.
   * @param {string} options.status Status.
   * @param {object} options.data Session data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, sessionId, userId, provider, redirectUrl, returnUrl, status, data, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.sessionId = sessionId;
    this.provider = provider;
    this.userId = userId;
    this.redirectUrl = redirectUrl;
    this.returnUrl = returnUrl;
    this.status = status;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = { KycSessionEntity };
