import qs from 'qs';
import { toUnderscoreObject } from 'helpers/toUnderscore';
import cleanDeep from 'clean-deep';

export default {
  dataURL: 'workflow-processes',
  sourceName: 'processList',
  autoLoad: true,
  getDataUrl: (
    url,
    {
      page,
      rowsPerPage = 10,
      filters,
      filters: {
        from_created_at,
        to_created_at,
        from_updated_at,
        to_updated_at,
      },
    },
  ) => {
    if (from_created_at) {
      filters['from_created_at'] = from_created_at;
    } else {
      delete filters['from_created_at'];
    }

    if (to_created_at) {
      filters['to_created_at'] = to_created_at;
    } else {
      delete filters['to_created_at'];
    }

    if (from_updated_at) {
      filters['from_updated_at'] = from_updated_at;
    } else {
      delete filters['from_updated_at'];
    }

    if (to_updated_at) {
      filters['to_updated_at'] = to_updated_at;
    } else {
      delete filters['to_updated_at'];
    }

    const urlData = {
      filters: cleanDeep(toUnderscoreObject(filters)),
    };

    urlData.page = page;
    urlData.count = rowsPerPage;

    const queryString = qs.stringify(urlData, { arrayFormat: 'index' });
    return url + (queryString && '?' + queryString);
  },
};
