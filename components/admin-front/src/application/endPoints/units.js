import qs from 'qs';
import { exportUnits } from 'application/actions/units';

export default {
  dataURL: 'units',
  sourceName: 'unitList',
  actions: { exportUnits },
  getDataUrl: (
    dataURL,
    { page, rowsPerPage, filters: { id, based_on, name } },
    useQueryParams = true,
  ) => {
    const queryString = qs.stringify(
      {
        'filters.name': name,
        'filters.id': id,
        'filters.based_on': based_on,
        'filters.admin_units':
          window.location.pathname === '/users/systemUnits',
        count: rowsPerPage,
        page: page || 1,
      },
      { arrayFormat: 'index' },
    );

    return dataURL + (useQueryParams && queryString ? '?' + queryString : '');
  },
};
