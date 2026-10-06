import moment from 'moment';
import { getConfig } from './configLoader';

export default function humanDateFormat(dateString: string | Date, format = 'DD.MM.YYYY'): string {
  const config = getConfig();
  const { dateFormat } = (config.variables as { dateFormat?: string; dateTimeFormat?: string }) || {};
  return moment(dateString).format(dateFormat || format);
}

export function humanDateTimeFormat(dateString: string | Date, format = 'DD.MM.YYYY HH:mm'): string {
  const config = getConfig();
  const { dateTimeFormat } = (config.variables as { dateFormat?: string; dateTimeFormat?: string }) || {};
  return moment(dateString).format(dateTimeFormat || format);
}

export function dateToMoment(birthday: string): moment.Moment | string {
  let time: moment.Moment | string = birthday;
  const elements = birthday.split('/');

  if (elements.length === 3) {
    const m = moment();
    m.date(Number(elements[0]));
    m.months(Number(elements[1]) - 1);
    m.year(Number(elements[2]));
    time = m;
  }

  return time;
}

export function today(): moment.Moment {
  return moment(new Date());
}

export function fourteenYearsAgo(format = ''): moment.Moment | string {
  const date = today().subtract(14, 'years');
  return format ? date.format(format) : date;
}

export const filterFormat = 'YYYY-MM-DD';
export const filterMinDate = '1900-01-01';
export const filterMaxDate = today().add(10, 'years').format(filterFormat);
