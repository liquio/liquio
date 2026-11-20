/* eslint-disable camelcase */
import { exportRegisters, createRegister, saveRegister, deleteRegister } from 'application/actions/registry';
import { addMessage } from 'actions/error';
import qs from 'qs';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'registers',
  sourceName: 'registersList',
  actions: {
    exportRegisters,
    addMessage,
    createRegister,
    saveRegister,
    deleteRegister
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
  },
  getDataUrl: (dataURL, { page, rowsPerPage, filters }, useQueryParams = true) => {
    const { id, key_id, name } = filters;
    const offset = ((page || 1) - 1) * (rowsPerPage as number);

    const queryString = qs.stringify({ offset, limit: rowsPerPage, id, key_id, name }, { arrayFormat: 'index' });

    return dataURL + (useQueryParams && queryString ? '?' + queryString : '');
  }
} satisfies DataTableEndpoint;
