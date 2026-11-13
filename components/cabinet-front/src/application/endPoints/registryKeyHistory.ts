import qs from 'qs';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryKeyHistoryList',
  getDataUrl: (dataURL, { page, rowsPerPage, filters }, useQueryParams = true) => {
    const { keyId, recordId } = filters;
    const offset = ((page || 1) - 1) * (rowsPerPage as number);

    const queryString = qs.stringify({ offset, limit: rowsPerPage }, { arrayFormat: 'index' });

    return `registers/keys/${keyId}/records/${recordId}/history` + (useQueryParams && queryString ? '?' + queryString : '');
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
