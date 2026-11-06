import qs from 'qs';
import cleanDeep from 'clean-deep';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import dotToPath from 'helpers/dotToPath';

interface GetDataUrlParams {
  page?: number;
  rowsPerPage?: number;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  search?: string;
}

export default (url: string, { page = 1, rowsPerPage = 5, filters, sort, search }: GetDataUrlParams): string => {
  const queryString = qs.stringify(
    cleanDeep({
      search,
      limit: rowsPerPage,
      // withoutTemplate: 'false',
      offset: (page - 1) * rowsPerPage,
      sort: toUnderscoreObject(sort as Record<string, unknown>),
      data_like: toUnderscoreObject(dotToPath(filters) as Record<string, unknown>, false),
    }),
    // `qs`'s real ArrayFormat type only allows 'indices' | 'brackets' | 'repeat' | 'comma' —
    // 'index' isn't one of them, a pre-existing typo not fixed here (qs falls back to its
    // default array-serialization behavior for an unrecognized value at runtime).
    { arrayFormat: 'index' as never },
  );

  return url + (queryString && '?' + queryString);
};
