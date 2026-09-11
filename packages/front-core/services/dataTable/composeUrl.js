import qs from 'qs';
import cleanDeep from 'clean-deep';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';

export default (url, { page, rowsPerPage, filters = {}, sort, search, rawFilters }) => {
  let urlData = {};

  if (rawFilters) {
    urlData = {
      ...filters
    };
  } else {
    urlData.filters = toUnderscoreObject(dotToPath(cleanDeep(filters)), false);
    urlData.sort = toUnderscoreObject(sort);
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
};
