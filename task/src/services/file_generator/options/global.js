
const moment = require('moment');
const Option = require('./option');

/**
 * Global option.
 */
class GlobalOption extends Option {
  /**
   * Get global options.
   */
  get() {
    return {
      'global.currentDate': moment().format('DD.MM.YYYY')
    };
  }
}

module.exports = GlobalOption;
