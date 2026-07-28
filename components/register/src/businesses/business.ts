import { Log } from 'back-core';

/**
 * Business.
 */
export default class Business {
  config: object;
  protected log: Log;

  /**
   * Business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    this.config = config;

    this.log = Log.getInstance();
  }
}
