import qs from 'qs';

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryKeyHistoryList',
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { keyId, recordId } },
    useQueryParams = true
  ) => {
    const offset = ((page || 1) - 1) * rowsPerPage;

    const queryString = qs.stringify({ offset, limit: rowsPerPage }, { arrayFormat: 'index' });

    return (
      `registers/keys/${keyId}/records/${recordId}/history` +
      (useQueryParams && queryString ? '?' + queryString : '')
    );
  },
  mapData: (payload) => {
    const { meta } = payload;
    const { limit, count, offset } = meta || {};

    return {
      data: payload,
      page: Math.ceil(offset / limit) + 1,
      rowsPerPage: limit,
      count
    };
  }
};
