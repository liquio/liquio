import Handlebars from 'handlebars';
import moment from 'moment';

Handlebars.registerHelper({
  or: (...args) => {
    args.pop();
    return args.length > 2 ? args.some((arg) => !!arg) : false;
  },
  and: (...args) => {
    args.pop();
    return args.length > 2 ? args.every((arg) => !!arg) : false;
  },
  eq(v1, v2) {
    return v1 === v2;
  },
  ne(v1, v2) {
    return v1 !== v2;
  },
  includes(array, value) {
    return array.includes(value);
  },
  contains(needle, haystack, options) {
    needle = Handlebars.escapeExpression(needle);
    haystack = Handlebars.escapeExpression(haystack);
    return haystack.indexOf(needle) > -1
      ? options.fn(this)
      : options.inverse(this);
  },
  increment(index) {
    index++;
    return index;
  },
  dateFormat(date, format) {
    const isDateObject =
      date && typeof date === 'object' && date.day && date.month && date.year;
    const dateString = isDateObject
      ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(
          date.day,
        ).padStart(2, '0')}`
      : date;

    return (
      moment(dateString, isDateObject ? 'YYYY-MM-DD' : undefined).format(
        format,
      ) || ''
    );
  },
  formatNumberFinancial(number, afterPoint) {
    const fractionalPartLength = +afterPoint || 0;
    const n = 10 ** fractionalPartLength;
    const roundedNumber = (Math.round(+number * n) / n).toFixed(
      fractionalPartLength,
    );

    const [p1, p2] = `${roundedNumber}`.split('.');

    const formatedPart = Intl.NumberFormat('uk-UA').format(p1);
    const floatPart = p2 ? `,${p2}` : '';

    return `${formatedPart}${floatPart}`;
  },
  gt: (v1, v2) => Number(v1) > Number(v2),
  lt: (v1, v2) => Number(v1) < Number(v2),
  gte: (v1, v2) => Number(v1) >= Number(v2),
  lte: (v1, v2) => Number(v1) <= Number(v2),
  sortBy: (valToSort, field, order = 'ASC') => {
    if (Array.isArray(valToSort) && typeof order === 'string') {
      const orderNormalized = order.toUpperCase().trim();
      if (['ASC', 'DESC'].includes(orderNormalized)) {
        return valToSort.sort((a, b) =>
          a[field] > b[field]
            ? orderNormalized === 'ASC'
              ? 1
              : -1
            : orderNormalized === 'ASC'
            ? -1
            : 1,
        );
      }
    }
    return valToSort;
  },
  size: (v) => {
    if (typeof v === 'string' || Array.isArray(v)) return v.length;
    if (typeof v === 'object' && v !== null) return Object.keys(v).length;
    return undefined;
  },
});

export default Handlebars;
