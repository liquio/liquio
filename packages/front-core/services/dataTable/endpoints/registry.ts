import qs from 'qs';
import type { DataTableEndpoint } from 'services/dataTable/types';

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryRecordList',
  sticky: false,
  autoLoad: true,
  method: 'POST',
  getDataUrl: (dataURL, { page = 1, rowsPerPage, filters, sort }, useQueryParams = true) => {
    const { keyId, control, strict, name: search, ...rest } = filters;
    const offset = ((page as number) - 1) * (rowsPerPage as number);
    const queryString = qs.stringify(
      {
        offset,
        limit: rowsPerPage,
        search,
        sort,
        control,
        strict,
        ...rest
      },
      { arrayFormat: 'index' }
    );

    return `${dataURL}/${keyId}/records/filter` + (useQueryParams && queryString ? '?' + queryString : '');
  },
  mapData: (payload) => {
    const { meta } = payload as { meta?: { limit?: number; count?: number } };
    const { limit, count } = meta || {};

    return {
      data: payload,
      rowsPerPage: limit,
      count
    };
  }
} satisfies DataTableEndpoint;
