import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import qs from 'qs';

export const requestStatistics = () => (dispatch) =>
  api.get('sql-reports', 'REQUEST_STATISRICS', dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const requestStatisticsById = (id, options) => (dispatch) => {
  const queryString = qs.stringify(options, { arrayFormat: 'index' });

  return api
    .get(
      `sql-reports/${id}?${queryString}`,
      'REQUEST_STATISRICS_BY_ID',
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
};
