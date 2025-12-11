import qs from 'qs';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';

export default {
  dataURL: 'tasks',
  sourceName: 'taskList',
  startPage: 0,
  sticky: true,
  autoLoad: true,
  getDataUrl: (
    url,
    {
      page,
      rowsPerPage,
      filters: { from_created_at, to_created_at, name, ...filters },
      sort,
      search
    }
  ) => {
    const urlData = {
      filters: toUnderscoreObject(dotToPath({ ...filters, search: name }), false),
      sort: toUnderscoreObject(sort)
    };

    if (from_created_at) {
      urlData.from_created_at = from_created_at;
    }

    if (to_created_at) {
      urlData.to_created_at = to_created_at;
    }

    if (page) {
      urlData.page = page;
    }

    if (rowsPerPage) {
      urlData.count = rowsPerPage;
    }

    if (search) {
      urlData.search = search;
    }

    const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
    return url + (queryString && '?' + queryString);
  }
};
