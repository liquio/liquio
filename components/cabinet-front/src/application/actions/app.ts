import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export * from 'core/actions/app';

export const getUIFilters = () => (dispatch: Dispatch) => api.get('ui-filters', 'GET_UI_FILTERS', dispatch);

export const setSidebarMargin = (margin: unknown) => (dispatch: Dispatch) =>
  dispatch({ type: 'APP/SET_SIDEBAR_MARGIN', payload: margin });
