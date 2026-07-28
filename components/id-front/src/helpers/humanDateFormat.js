import moment from 'moment';
import { getConfig } from './configLoader';

export default function humanDateFormat(dateString, format = 'DD.MM.YYYY') {
  const config = getConfig();
  const { dateFormat } = config.variables || {};
  return moment(dateString).format(dateFormat || format);
}

export function humanDateTimeFormat(dateString, format = 'DD.MM.YYYY HH:mm') {
  const config = getConfig();
  const { dateTimeFormat } = config.variables || {};
  return moment(dateString).format(dateTimeFormat || format);
}

export function dateToMoment(birthday) {
  let time = birthday;
  const elements = birthday.split('/');

  if (elements.length === 3) {
    time = moment();
    time.date(elements[0]);
    time.months(elements[1] - 1);
    time.year(elements[2]);
  }

  return time;
}

export function today() {
  return moment(new Date());
}

export function fourteenYearsAgo(format = '') {
  const date = today().subtract(14, 'years');
  return format ? date.format(format) : date;
}

export const filterFormat = 'YYYY-MM-DD';
export const filterMinDate = '1900-01-01';
export const filterMaxDate = today().add(10, 'years').format(filterFormat);
