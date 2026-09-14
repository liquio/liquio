import Handlebars from 'handlebars';
import moment from 'moment';

Handlebars.registerHelper({
  or: (...args: unknown[]) => {
    args.pop();
    return args.length > 2 ? args.some((arg) => !!arg) : false;
  },
  and: (...args: unknown[]) => {
    args.pop();
    return args.length > 2 ? args.every((arg) => !!arg) : false;
  },
  eq(v1: unknown, v2: unknown) {
    return v1 === v2;
  },
  ne(v1: unknown, v2: unknown) {
    return v1 !== v2;
  },
  includes(array: unknown[], value: unknown) {
    return array.includes(value);
  },
  contains(needle: string, haystack: string, options: Handlebars.HelperOptions) {
    const escapedNeedle = Handlebars.escapeExpression(needle);
    const escapedHaystack = Handlebars.escapeExpression(haystack);
    return escapedHaystack.indexOf(escapedNeedle) > -1
      ? options.fn(this)
      : options.inverse(this);
  },
  increment(index: number) {
    index++;
    return index;
  },
  dateFormat(date: unknown, format: string) {
    const dateObject = date as { day?: number; month?: number; year?: number } | string | undefined;
    const isDateObject =
      !!dateObject && typeof dateObject === 'object' && !!dateObject.day && !!dateObject.month && !!dateObject.year;
    const dateString = isDateObject
      ? `${(dateObject as { year: number }).year}-${String((dateObject as { month: number }).month).padStart(2, '0')}-${String(
          (dateObject as { day: number }).day,
        ).padStart(2, '0')}`
      : (date as string);

    return (
      moment(dateString, isDateObject ? 'YYYY-MM-DD' : undefined).format(
        format,
      ) || ''
    );
  },
  formatNumberFinancial(number: unknown, afterPoint: unknown) {
    const fractionalPartLength = +(afterPoint as number) || 0;
    const n = 10 ** fractionalPartLength;
    const roundedNumber = (Math.round(+(number as number) * n) / n).toFixed(
      fractionalPartLength,
    );

    const [p1, p2] = `${roundedNumber}`.split('.');

    const formatedPart = Intl.NumberFormat('uk-UA').format(p1 as unknown as number);
    const floatPart = p2 ? `,${p2}` : '';

    return `${formatedPart}${floatPart}`;
  },
  gt: (v1: unknown, v2: unknown) => Number(v1) > Number(v2),
  lt: (v1: unknown, v2: unknown) => Number(v1) < Number(v2),
  gte: (v1: unknown, v2: unknown) => Number(v1) >= Number(v2),
  lte: (v1: unknown, v2: unknown) => Number(v1) <= Number(v2),
  sortBy: (valToSort: unknown, field: string, order = 'ASC') => {
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
  size: (v: unknown) => {
    if (typeof v === 'string' || Array.isArray(v)) return v.length;
    if (typeof v === 'object' && v !== null) return Object.keys(v).length;
    return undefined;
  },
});

export default Handlebars;
