import qs from 'qs';
import { toUnderscoreObject } from 'helpers/toUnderscore';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'workflow-tags',
  sourceName: 'workflowTags',
  getDataUrl: (url, { page, filters, rowsPerPage, sort }) => {
    const urlData: Record<string, unknown> = {
      filters: toUnderscoreObject(filters)
    };

    urlData.currentPage = page;
    urlData.perPage = rowsPerPage;
    urlData.sort = sort;

    const queryString = qs.stringify(urlData, { arrayFormat: 'brackets' });

    return url + (queryString && '?' + queryString);
  }
} satisfies DataTableEndpoint;
