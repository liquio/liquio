import qs from 'qs';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

interface SearchKey {
  columnName?: string;
  value?: unknown;
}

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryHistoryList',
  getDataUrl: (dataURL, { page, rowsPerPage, filters }, useQueryParams = true) => {
    const { keyId, searchKeys } = filters as { keyId?: unknown; searchKeys?: SearchKey[] };
    const offset = ((page || 1) - 1) * (rowsPerPage as number);

    const queryString = qs.stringify({ offset, limit: rowsPerPage }, { arrayFormat: 'index' });

    let url = `${dataURL}/${keyId}/history` + (useQueryParams && queryString ? '?' + queryString : '');

    if ((searchKeys || []).length) {
      url +=
        '&' +
        (searchKeys as SearchKey[])
          .map(({ columnName, value }) => `record_data_like[${(columnName || '').replace('data.', '')}]=${value}`)
          .join('&');
    }

    return url;
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
