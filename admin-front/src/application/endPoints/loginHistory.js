import qs from 'qs';
import { toUnderscoreObject } from 'helpers/toUnderscore';

export default {
  dataURL: 'login-history',
  sourceName: 'loginHistory',
  autoLoad: true,
  searchFilterField: 'search',
  getDataUrl: (url, { page, rowsPerPage = 10, filters }) => {
    const urlData = { filter: toUnderscoreObject(filters) };

    urlData.limit = rowsPerPage;
    urlData.offset = ((page || 1) - 1) * rowsPerPage;

    const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
    return url + (queryString && '?' + queryString);
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
