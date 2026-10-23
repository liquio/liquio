import qs from 'qs';
import { toUnderscoreObject } from 'helpers/toUnderscore';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'user-admin-actions',
  sourceName: 'userOperations',
  autoLoad: true,
  searchFilterField: 'search',
  getDataUrl: (url, { page, rowsPerPage = 10, filters }) => {
    const urlData: Record<string, unknown> = { filter: toUnderscoreObject(filters) };

    urlData.limit = rowsPerPage;
    urlData.offset = ((page || 1) - 1) * (rowsPerPage as number);

    const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
    return url + (queryString && '?' + queryString);
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
