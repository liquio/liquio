import cleanDeep from 'clean-deep';
import { ChangeEvent } from 'components/JsonSchema';
import stringToNumber from 'helpers/stringToNumber';
import humanDateFormat from 'helpers/humanDateFormat';
import { JsonSchemaNode } from '../../types';

interface ItemsSchema {
  properties?: Record<string, JsonSchemaNode>;
}

interface HeaderCellData {
  label?: string;
  colspan?: number;
  [key: string]: unknown;
}

const getLastNotEmptyIndex = (list: Array<Record<string, unknown>>): number => {
  for (let i = list.length - 1; i >= 0; i--) {
    if (Object.keys(list[i]).length) {
      return i;
    }
  }
  return -1;
};

export const input = (value: unknown, items: ItemsSchema = {}): Array<Array<{ value: unknown }>> => {
  const props = Object.keys(items.properties || {});
  return Object.values(value || {})
    .filter(Boolean)
    .map((item: Record<string, unknown>) => {
      if (!item) {
        return [];
      }
      return props.map((prop) => ({ value: item[prop] || '' }));
    });
};

export const arrayToData = (array: unknown[][] = [], items: ItemsSchema = {}): Array<Record<string, unknown>> =>
  array
    .filter((row) => Array.isArray(row) && row.length)
    .map((row) =>
      Object.keys(items.properties as Record<string, JsonSchemaNode>).reduce((acc, propertyName, index) => {
        let value: unknown = row[index] ?? '';
        const property = (items.properties as Record<string, JsonSchemaNode>)[propertyName];

        console.log('value', value);
        if (value instanceof Date) {
          value = humanDateFormat(value, 'DD.MM.YYYY');
        }

        if (property.type === 'string') {
          value += '';
        }

        return { ...acc, [propertyName]: value };
      }, {} as Record<string, unknown>),
    );

export const output =
  (onChange: (event: unknown) => void, value: unknown, items: ItemsSchema = {}, useCellChangeHandler = false) =>
  (changes: Array<{ row: number; col: number; value: unknown }>, additions: Array<{ row: number; col: number; value: unknown }>): void => {
    const props = Object.keys(items.properties || {});
    let data: Array<Record<string, unknown>> = ([] as Array<Record<string, unknown>>).concat(value as Record<string, unknown>).filter(Boolean);
    ([] as Array<{ row: number; col: number; value: unknown }>)
      .concat(changes, additions)
      .filter(Boolean)
      .forEach(({ row, col, value: newValue }) => {
        const propName = props[col];
        const property = (items.properties as Record<string, JsonSchemaNode>)[propName];

        if (property && property.control === 'currency.input') {
          newValue = stringToNumber(newValue).toFixed(
            (property.decimalPlaces as number) || 2,
          );
        }

        if (useCellChangeHandler) {
          (onChange as unknown as (row: number, propName: string, value: unknown) => void).bind(null, row, propName)(newValue);
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
      data = cleanDeep(data, { emptyObjects: false, emptyArrays: false }) as Array<Record<string, unknown>>;
      const lastIndex = getLastNotEmptyIndex(data);
      onChange(new ChangeEvent(data.slice(0, lastIndex + 1), true) as unknown);
    }
  };

export const headerData = (headers: Array<Array<HeaderCellData | string>>) =>
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
