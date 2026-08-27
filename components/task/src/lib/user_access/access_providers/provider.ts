/**
 * Access provider.
 */
export class AccessProvider {
  /**
   * Name.
   * @returns {string} Provider name.
   */
  get name(): string {
    throw new Error('Method should be defined in child class.');
  }

  /**
   * Check access.
   * @param {object} req HTTP request.
   * @returns {Promise<boolean>} Acces granted indicator promise.
   */
  async checkAccess(_req): Promise<any> {
    throw new Error('Method should be defined in child class.');
  }
}
