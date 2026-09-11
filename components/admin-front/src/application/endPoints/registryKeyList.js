import qs from 'qs';
import {
  createKey,
  saveKey,
  deleteKey,
  getRegister,
} from 'application/actions/registry';

export default {
  dataURL: 'registers',
  sourceName: 'registryKeyList',
  actions: { createKey, saveKey, deleteKey, getRegister },
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { registerId, name: search }, sort },
    useQueryParams = true,
  ) => {
    const offset = ((page || 1) - 1) * rowsPerPage;

    const queryString = qs.stringify(
      { offset, limit: rowsPerPage, search, sort, register_id: registerId },
      { arrayFormat: 'index' },
    );

    return (
      `${dataURL}/keys` +
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
      count,
    };
  },
};
