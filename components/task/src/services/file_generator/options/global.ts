
import moment from 'moment';
import { Option } from './option';

/**
 * Global option.
 */
export class GlobalOption extends Option {
  /**
   * Get global options.
   */
  async get() {
    return {
      'global.currentDate': moment().format('DD.MM.YYYY')
    };
  }
}

