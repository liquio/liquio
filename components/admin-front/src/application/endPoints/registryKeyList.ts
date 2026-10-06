import qs from 'qs';
import { createKey, saveKey, deleteKey, getRegister } from 'application/actions/registry';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'registers',
  sourceName: 'registryKeyList',
  actions: { createKey, saveKey, deleteKey, getRegister },
  getDataUrl: (dataURL, { page, rowsPerPage, filters, sort }, useQueryParams = true) => {
    const { registerId, name: search } = filters;
    const offset = ((page || 1) - 1) * (rowsPerPage as number);

    const queryString = qs.stringify({ offset, limit: rowsPerPage, search, sort, register_id: registerId }, { arrayFormat: 'index' });

    return `${dataURL}/keys` + (useQueryParams && queryString ? '?' + queryString : '');
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
