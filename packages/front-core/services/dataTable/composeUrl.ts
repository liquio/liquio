import qs from 'qs';
import cleanDeep from 'clean-deep';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';
import type { DataTableRequestState } from 'services/dataTable/types';

export default (url: string, { page, rowsPerPage, filters = {}, sort, search, rawFilters }: Partial<DataTableRequestState>): string => {
  let urlData: Record<string, unknown> = {};

  if (rawFilters) {
    urlData = {
      ...filters
    };
  } else {
    urlData.filters = toUnderscoreObject(dotToPath(cleanDeep(filters)) as Record<string, unknown>, false);
    urlData.sort = toUnderscoreObject(sort || {});
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
