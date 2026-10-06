import { LiquioProvider } from './providers/liquio';

/**
 * Blockchain Requester.
 */
export class BlockchainRequester {
  static singleton: BlockchainRequester;

  provider: any;

  constructor(config: any) {
    // Define singleton.
    if (!BlockchainRequester.singleton) {
      this.provider = new (BlockchainRequester.ProvidersList as any)[config.provider](config);

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
  async register(options?: any): Promise<any> {
    return await this.provider.register(options);
  }

  /**
   * @param {object} options
   */
  async detail(options: any): Promise<any> {
    const { id } = options;
    await this.provider.detail(id);
  }

  /**
   * @param {object} options
   */
  async update(options: any): Promise<any> {
    await this.provider.update(options);
  }

  /**
   * @param {object} options
   */
  async revoke(options: any): Promise<any> {
    await this.provider.revoke(options);
  }
}
