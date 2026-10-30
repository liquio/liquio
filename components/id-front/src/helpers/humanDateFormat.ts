import moment from 'moment';
import type { Moment } from 'moment';
import { getConfig } from './configLoader';

export default function humanDateFormat(dateString: moment.MomentInput, format = 'DD.MM.YYYY'): string {
  const config = getConfig();
  const { dateFormat } = config.variables || {};
  return moment(dateString).format(dateFormat || format);
}

export function humanDateTimeFormat(dateString: moment.MomentInput, format = 'DD.MM.YYYY HH:mm'): string {
  const config = getConfig();
  const { dateTimeFormat } = config.variables || {};
  return moment(dateString).format(dateTimeFormat || format);
}

export function dateToMoment(birthday: string): string | Moment {
  let time: string | Moment = birthday;
  const elements = birthday.split('/');

  if (elements.length === 3) {
    const date = moment();
    // moment/Date setters coerce their argument with ToNumber, so Number() keeps the old string handling.
    date.date(Number(elements[0]));
    date.months(Number(elements[1]) - 1);
    date.year(Number(elements[2]));
    time = date;
  }

  return time;
}

export function today(): Moment {
  return moment(new Date());
}

export function fourteenYearsAgo(format = ''): string | Moment {
  const date = today().subtract(14, 'years');
  return format ? date.format(format) : date;
}

export const filterFormat = 'YYYY-MM-DD';
export const filterMinDate = '1900-01-01';
export const filterMaxDate = today().add(10, 'years').format(filterFormat);
