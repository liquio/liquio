import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

const SET_OPEN_SIDEBAR = 'APP/SET_OPEN_SIDEBAR';
const SET_OPEN_DAWER = 'APP/SET_OPEN_DAWER';
const SET_MAIN_SCROLLBAR = 'APP/SET_MAIN_SCROLLBAR';

const RESET_STATE = 'APP/RESET_STATE';

export const ping = () => (dispatch: Dispatch) => api.get('test/ping', 'PING', dispatch);

export const healthCheck = () => (dispatch: Dispatch) =>
  api.get('test/ping/services', 'GET_SERVICES_STATUSES', dispatch).catch((error) => {
    return error;
  });

export const setOpenSidebar = (open: boolean) => ({
  type: SET_OPEN_SIDEBAR,
  payload: open
});

export const setOpenDrawer = (open: boolean) => ({
  type: SET_OPEN_DAWER,
  payload: open
});

export const setMainScrollbar = (scrollbar: string, ref: unknown) => ({
  type: SET_MAIN_SCROLLBAR,
  payload: {
    scrollbar,
    ref
  }
});

export const resetState = () => ({
  type: RESET_STATE
});
