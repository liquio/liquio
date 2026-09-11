import { ERROR_OVERRIDE } from '../../../../../constants/error';

export class Provider {
  /**
   * Get detail info about the document
   * @abstract
   * @param {string} id
   */
  async detail(_id?: string): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Register new document
   * @abstract
   * @param {object} options
   */
  async register(_options?: any): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update existing document
   * @abstract
   * @param {object} options
   */
  async update(_options?: any): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Revoke existing document
   * @abstract
   * @param {object} options
   */
  async revoke(_options?: any): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }
}
