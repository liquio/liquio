import * as api from 'services/api';
import qs from 'qs';

const REQUEST_METRICS = 'REQUEST_METRICS';
const REQUEST_EXTREADER = 'REQUEST_EXTREADER';

export const requestMetrics = () => (dispatch) =>
  api.get('metrics', REQUEST_METRICS, dispatch).catch((error) => error);

export const requestMethods = () => (dispatch) =>
  api
    .get('ext-reader/summary-information', REQUEST_EXTREADER, dispatch)
    .catch((error) => error);

export const requestProcessesMetrics = (options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });

  return api
    .get(`metrics/bpmn-process?${queryString}`, REQUEST_METRICS, dispatch)
    .catch((error) => error);
};
