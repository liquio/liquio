// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

export class Option {
  /**
   * Get.
   * @param {object} options Options.
   */
  async get(_options): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }
}
