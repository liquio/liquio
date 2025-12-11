/* eslint-disable camelcase */
import {
  exportRegisters,
  createRegister,
  saveRegister,
  deleteRegister,
} from 'application/actions/registry';
import { addMessage } from 'actions/error';
import qs from 'qs';

export default {
  dataURL: 'registers',
  sourceName: 'registersList',
  actions: {
    exportRegisters,
    addMessage,
    createRegister,
    saveRegister,
    deleteRegister,
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
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { id, key_id, name } },
    useQueryParams = true,
  ) => {
    const offset = ((page || 1) - 1) * rowsPerPage;

    const queryString = qs.stringify(
      { offset, limit: rowsPerPage, id, key_id, name },
      { arrayFormat: 'index' },
    );

    return dataURL + (useQueryParams && queryString ? '?' + queryString : '');
  },
};
