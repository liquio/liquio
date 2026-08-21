const moment = require('moment-business-days');

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Event delayer.
 */
class EventDelayer {
  constructor() {
    // Define singleton.
    if (!EventDelayer.singleton) {
      EventDelayer.singleton = this;
    }

    return EventDelayer.singleton;
  }

  /**
   * Delay
   * @param {string} time Time.
   * @returns {string}
   */
  async delay(time) {
    return this.prepareDueDate(time);
  }

  /**
   * Prepare due date.
   * @private
   * @param {string} time Time.
   * @returns {string}
   */
  prepareDueDate(time) {
    let dueDate;

    if (/[0-9]+wd/i.test(time)) {
      const workDays = parseInt(time);
      const days = moment(moment().businessAdd(workDays)._d).diff(moment(), 'days') + 1;
      dueDate = moment().add(days, 'days').format(DATE_FORMAT);
    } else if (/[0-9]+d/i.test(time)) {
      const days = parseInt(time);
      dueDate = moment().add(days, 'days').format(DATE_FORMAT);
    } else if (/[0-9]+h/i.test(time)) {
      const hours = parseInt(time);
      dueDate = moment().add(hours, 'hours').format(DATE_FORMAT);
    } else if (/[0-9]+m/i.test(time)) {
      const minutes = parseInt(time);
      dueDate = moment().add(minutes, 'minutes').format(DATE_FORMAT);
    } else {
      dueDate = moment(time).format(DATE_FORMAT);
    }

    if (!moment(dueDate, DATE_FORMAT).isValid()) {
      throw new Error('Invalid time format.');
    }

    return dueDate;
  }
}

module.exports = EventDelayer;
