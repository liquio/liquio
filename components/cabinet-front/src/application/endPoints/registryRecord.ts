import qs from 'qs';
import moment from 'moment';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

const specialKeys = ['update_to', 'updatedAt'];

interface SearchKey {
  [key: string]: unknown;
}

const arrayToObject = (array: SearchKey[], key: string, val: string): Record<string, unknown> => {
  const initialValue: Record<string, unknown> = {};
  return array.reduce((obj, item) => {
    const value = item[val];
    const itemKey = item[key] as string;
    const name = `data_like[${itemKey.replace('data.', '')}]`;

    if (specialKeys.includes(itemKey)) {
      const updatedFrom = moment(value as string, ['DD.MM.YYYY', 'YYYY-MM-DD'], true).format('YYYY-MM-DD');
      const updatedTo = moment(updatedFrom).add(1, 'days').format('YYYY-MM-DD');
      return {
        ...obj,
        updated_from: updatedFrom,
        updated_to: updatedTo
      };
    }

    return {
      ...obj,
      [name]: value
    };
  }, initialValue);
};

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryRecordList',
  getDataUrl: (dataURL, { page, rowsPerPage, filters, sort }, useQueryParams = true) => {
    const { keyId, name: search, searchKeys } = filters as { keyId?: unknown; name?: unknown; searchKeys?: SearchKey[] };
    const offset = ((page || 1) - 1) * (rowsPerPage as number);

    const keys = searchKeys ? arrayToObject(searchKeys, 'columnName', 'value') : {};

    const queryString = qs.stringify({ offset, limit: rowsPerPage, search, sort, ...keys }, { arrayFormat: 'index' });

    return `${dataURL}/${keyId}/records` + (useQueryParams && queryString ? '?' + queryString : '');
  },
  mapData: (payload) => {
    const { meta } = payload as { meta?: { limit?: number; count?: number; offset?: number } };
    const { limit, count, offset } = meta || {};

    return {
      data: payload,
      page: Math.ceil((offset ?? 0) / (limit ?? 1)) + 1,
      rowsPerPage: limit,
      count
    };
  }
} satisfies DataTableEndpoint;
