import qs from 'qs';
import { exportUnits } from 'application/actions/units';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'units',
  sourceName: 'unitList',
  actions: { exportUnits },
  getDataUrl: (dataURL, { page, rowsPerPage, filters }, useQueryParams = true) => {
    const { id, based_on, name } = filters;

    const queryString = qs.stringify(
      {
        'filters.name': name,
        'filters.id': id,
        'filters.based_on': based_on,
        'filters.admin_units': window.location.pathname === '/users/systemUnits',
        count: rowsPerPage,
        page: page || 1
      },
      { arrayFormat: 'index' }
    );

    return dataURL + (useQueryParams && queryString ? '?' + queryString : '');
  }
} satisfies DataTableEndpoint;
