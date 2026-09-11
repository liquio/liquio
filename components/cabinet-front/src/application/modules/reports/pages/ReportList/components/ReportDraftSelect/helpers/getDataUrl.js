import qs from 'qs';
import cleanDeep from 'clean-deep';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';

export default (url, { page = 1, rowsPerPage = 5, filters, sort, search }) => {
  const queryString = qs.stringify(
    cleanDeep({
      search,
      limit: rowsPerPage,
      offset: (page - 1) * rowsPerPage,
      sort: toUnderscoreObject(sort),
      data_like: toUnderscoreObject(dotToPath(filters), false)
    }),
    { arrayFormat: 'index' }
  );

  return url + (queryString && '?' + queryString);
};
