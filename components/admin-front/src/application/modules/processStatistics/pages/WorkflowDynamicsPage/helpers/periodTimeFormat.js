import moment from 'moment';

export const timelineTimeFormat = (value, period) => {
  const momentValue = moment(value);
  switch (period) {
    case '1 day':
      return momentValue.format('HH:mm');
    case '1 month':
      return momentValue.format('DD MMM');
    case '1 year':
      return momentValue.format('MMM YYYY');
    default:
      return '';
  }
};

export default (value, period) => {
  const momentValue = moment(value);
  switch (period) {
    case '1 day':
      return momentValue.format('YYYY-MM-DD');
    case '1 month':
      return momentValue.format('YYYY-MMMM');
    case '1 year':
      return momentValue.format('YYYY');
    default:
      return '';
  }
};
