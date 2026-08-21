import qs from 'qs';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import { exportWorkflow, deleteWorkflow } from 'application/actions/workflow';
import { getConfig } from 'core/helpers/configLoader';

export default {
  dataURL: 'workflows',
  sourceName: 'workflowList',
  getDataUrl: (url, { page, filters, rowsPerPage, sort }) => {
    const searchByCode = (filters?.search || '').length;

    delete filters.excludeWorkflowTemplateCategoryId;

    const testCategory = getConfig()?.testCategory;
    if (testCategory) {
      filters.workflowTemplateCategoryId = testCategory;
    }

    if (searchByCode) {
      delete filters.name;
      delete filters.id;
    }

    const urlData = {
      filters: toUnderscoreObject(filters)
    };

    urlData.page = page;
    urlData.count = rowsPerPage;
    urlData.sort = sort;

    const regexAsString = localStorage.getItem('searchRegex') === 'true';

    if (regexAsString) {
      urlData.options = { regex_as_string: true };
    } else {
      delete urlData.options;
    }

    const queryString = qs.stringify(urlData, { arrayFormat: 'index' });

    const checkUrl = searchByCode ? `${url}/search` : url;

    return checkUrl + (queryString && '?' + queryString);
  },
  actions: { exportWorkflow, deleteWorkflow }
};
