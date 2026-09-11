import qs from 'qs';

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryHistoryList',
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { keyId, searchKeys } },
    useQueryParams = true
  ) => {
    const offset = ((page || 1) - 1) * rowsPerPage;

    const queryString = qs.stringify({ offset, limit: rowsPerPage }, { arrayFormat: 'index' });

    let url =
      `${dataURL}/${keyId}/history` + (useQueryParams && queryString ? '?' + queryString : '');

    if ((searchKeys || []).length) {
      url +=
        '&' +
        searchKeys
          .map(({ columnName, value }) => {
            return `record_data_like[${(columnName || '').replace('data.', '')}]=${value}`;
          })
          .join('&');
    }

    return url;
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
