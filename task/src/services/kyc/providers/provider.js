class KycProvider {
  constructor() {
  }

  /**
   * @abstract
   */
  async testConnection() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * @abstract
   */
  async createSession() {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * @abstract
   */
  async getSession() {
    throw new Error('Method must be override for a specific provider.');
  }
}

module.exports = { KycProvider };
