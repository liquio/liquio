import cleanDeep from 'clean-deep';
import { ChangeEvent } from 'components/JsonSchema';
import stringToNumber from 'helpers/stringToNumber';
import humanDateFormat from 'helpers/humanDateFormat';

const getLastNotEmptyIndex = (list) => {
  for (let i = list.length - 1; i >= 0; i--) {
    if (Object.keys(list[i]).length) {
      return i;
    }
  }
  return -1;
};

export const input = (value, items = {}) => {
  const props = Object.keys(items.properties || {});
  return Object.values(value || {})
    .filter(Boolean)
    .map((item) => {
      if (!item) {
        return [];
      }
      return props.map((prop) => ({ value: item[prop] || '' }));
    });
};

export const arrayToData = (array = [], items = {}) =>
  array
    .filter((row) => Array.isArray(row) && row.length)
    .map((row) =>
      Object.keys(items.properties).reduce((acc, propertyName, index) => {
        let value = row[index] ?? '';
        const property = items.properties[propertyName];

        console.log('value', value);
        if (value instanceof Date) {
          value = humanDateFormat(value, 'DD.MM.YYYY');
        }

        if (property.type === 'string') {
          value += '';
        }

        return { ...acc, [propertyName]: value };
      }, {}),
    );

export const output =
  (onChange, value, items = {}, useCellChangeHandler = false) =>
  (changes, additions) => {
    const props = Object.keys(items.properties || {});
    let data = [].concat(value).filter(Boolean);
    []
      .concat(changes, additions)
      .filter(Boolean)
      .forEach(({ row, col, value: newValue }) => {
        const propName = props[col];
        const property = items.properties[propName];

        if (property && property.control === 'currency.input') {
          newValue = stringToNumber(newValue).toFixed(
            property.decimalPlaces || 2,
          );
        }

        if (useCellChangeHandler) {
          onChange.bind(null, row, propName)(newValue);
        } else {
          if (!data[row]) {
            data[row] = {};
          }
          if (!newValue) {
            if (data[row]) {
              data[row][propName] = undefined;
            }
            return;
          }

          data[row] = { ...data[row], [propName]: newValue };
        }
      });

    if (!useCellChangeHandler) {
      data = cleanDeep(data, { emptyObjects: false, emptyArrays: false });
      const lastIndex = getLastNotEmptyIndex(data);
      onChange(new ChangeEvent(data.slice(0, lastIndex + 1), true));
    }
  };

export const headerData = (headers) =>
  headers.map((header) =>
    header.map((cell) => {
      if (typeof cell === 'object') {
        return {
          value: cell.label,
          colSpan: cell.colspan || 1,
          hint: 'Valid',
          readOnly: true,
          disableEvents: true,
        };
      }

      return {
        value: cell,
        hint: 'Valid',
        readOnly: true,
        disableEvents: true,
      };
    }),
  );
