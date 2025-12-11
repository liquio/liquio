import * as api from 'services/api';

export * from 'core/actions/app';

export const getUIFilters = () => (dispatch) => api.get('ui-filters', 'GET_UI_FILTERS', dispatch);

export const setSidebarMargin = (margin) => (dispatch) =>
  dispatch({ type: 'APP/SET_SIDEBAR_MARGIN', payload: margin });
