import * as api from 'services/api';

const SET_CHECK_HIDDEN_FUNC = 'SET_CHECK_HIDDEN_FUNC';
const SET_CHECK_VALID_FUNC = 'SET_CHECK_VALID_FUNC';
const SET_POPUP_DATA = 'DEBUG_TOOLS/SET_POPUP_DATA';
const SET_CUSTOM_INTERFACE_DATA = 'DEBUG_TOOLS/SET_CUSTOM_INTERFACE_DATA';

export const setCheckHiddenFunc = (taskId, func) => ({
  type: SET_CHECK_HIDDEN_FUNC,
  payload: { taskId, func }
});

export const setCheckValidFunc = (taskId, func) => ({
  type: SET_CHECK_VALID_FUNC,
  payload: { taskId, func }
});

export const setPopupData = (data) => ({
  type: SET_POPUP_DATA,
  payload: data
});

export const setCustomInterfaceData = (data) => ({
  type: SET_CUSTOM_INTERFACE_DATA,
  payload: data
});

export const getMocksKeysByUser = (options) => (dispatch) =>
  api
    .get(`external_reader/mocks-keys-by-user${options}`, 'GET_MOCKS_BY_USER', dispatch)
    .catch((error) => {
      return error;
    });
