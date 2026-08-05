const LiquioProvider = require('./providers/liquio');

/**
 * Blockchain Requester.
 */
class BlockchainRequester {
  constructor(config) {
    // Define singleton.
    if (!BlockchainRequester.singleton) {
      this.provider = new BlockchainRequester.ProvidersList[config.provider](config);

      BlockchainRequester.singleton = this;
    }

    return BlockchainRequester.singleton;
  }

  /**
   * Get providers list.
   */
  static get ProvidersList() {
    return { liquio: LiquioProvider };
  }

  /**
   * @param {object} options
   */
  async register(options) {
    return await this.provider.register(options);
  }

  /**
   * @param {object} options
   */
  async detail(options) {
    const { id } = options;
    await this.provider.detail(id);
  }

  /**
   * @param {object} options
   */
  async update(options) {
    await this.provider.update(options);
  }

  /**
   * @param {object} options
   */
  async revoke(options) {
    await this.provider.revoke(options);
  }
}

module.exports = BlockchainRequester;
