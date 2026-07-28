export class KycProvider {
  constructor() {
  }

  /**
   * @abstract
   */
  async testConnection(..._args: any[]): Promise<any> {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * @abstract
   */
  async createSession(..._args: any[]): Promise<any> {
    throw new Error('Method must be override for a specific provider.');
  }

  /**
   * @abstract
   */
  async getSession(..._args: any[]): Promise<any> {
    throw new Error('Method must be override for a specific provider.');
  }
}

