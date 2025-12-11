const { ERROR_OVERRIDE } = require('../../../../../constants/error');

/* eslint-disable no-unused-vars  */
class Provider {
  /**
   * Get detail info about the document
   * @abstract
   * @param {string} id
   */
  async detail(id) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Register new document
   * @abstract
   * @param {object} options
   */
  async register(options) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update existing document
   * @abstract
   * @param {object} options
   */
  async update(options) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Revoke existing document
   * @abstract
   * @param {object} options
   */
  async revoke(options) {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Provider;
