import moment from 'moment';

const parseDate = (date, format) => {
  if (!date || date === 'Invalid date') return null;

  return {
    day: moment(date, format).format('DD'),
    month: moment(date, format).format('MM'),
    year: moment(date, format).format('YYYY'),
  };
};

export default parseDate;
