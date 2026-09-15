import moment from 'moment-business-days';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Event delayer.
 */
export class EventDelayer {
  static singleton: EventDelayer;

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
  async delay(time: string): Promise<string> {
    return this.prepareDueDate(time);
  }

  /**
   * Prepare due date.
   * @private
   * @param {string} time Time.
   * @returns {string}
   */
  prepareDueDate(time: string): string {
    let dueDate: string;

    if (/[0-9]+wd/i.test(time)) {
      const workDays = parseInt(time);
      const days = moment((moment().businessAdd(workDays) as any)._d).diff(moment(), 'days') + 1;
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
