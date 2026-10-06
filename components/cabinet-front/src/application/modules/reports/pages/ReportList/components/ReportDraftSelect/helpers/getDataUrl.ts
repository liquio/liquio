import qs from 'qs';
import cleanDeep from 'clean-deep';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';
import type { DataTableRequestState } from 'services/dataTable/types';

export default (url: string, { page = 1, rowsPerPage = 5, filters, sort, search }: DataTableRequestState): string => {
  const queryString = qs.stringify(
    cleanDeep({
      search,
      limit: rowsPerPage,
      offset: ((page as number) - 1) * (rowsPerPage as number),
      sort: toUnderscoreObject(sort as Record<string, unknown>),
      data_like: toUnderscoreObject(dotToPath(filters) as Record<string, unknown>, false)
    }) as never,
    { arrayFormat: 'index' }
  );

  return url + (queryString && '?' + queryString);
};
