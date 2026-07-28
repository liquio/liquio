import qs from 'qs';

export default {
  dataURL: 'registers/keys',
  sourceName: 'registryRecordList',
  sticky: false,
  autoLoad: true,
  method: 'POST',
  getDataUrl: (
    dataURL,
    {
      page = 1,
      rowsPerPage,
      filters: { keyId, control, strict, name: search, ...filters },
      sort,
    },
    useQueryParams = true,
  ) => {
    const offset = (page - 1) * rowsPerPage;
    const queryString = qs.stringify(
      {
        offset,
        limit: rowsPerPage,
        search,
        sort,
        control,
        strict,
        ...filters,
      },
      { arrayFormat: 'index' },
    );

    return (
      `${dataURL}/${keyId}/records/filter` +
      (useQueryParams && queryString ? '?' + queryString : '')
    );
  },
  mapData: (payload) => {
    const { meta } = payload;
    const { limit, count } = meta || {};

    return {
      data: payload,
      rowsPerPage: limit,
      count,
    };
  },
};
