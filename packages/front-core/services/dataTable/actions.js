import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import store from 'store';

import promiseChain from 'helpers/promiseChain';
import dispatchType from 'services/dataTable/dispatchType';
import composeUrl from 'services/dataTable/composeUrl';

import { addError } from 'actions/error';

const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';
const GET_LIST = 'GET_LIST';
const ON_ROW_SELECT = 'ON_ROW_SELECT';
const ON_CHANGE_PAGE = 'ON_CHANGE_PAGE';

const ON_FILTER_CHANGE = 'ON_FILTER_CHANGE';
const ON_CHANGE_ROWS_PER_PAGE = 'ON_CHANGE_ROWS_PER_PAGE';
const ON_ROWS_DELETE = 'ON_ROWS_DELETE';
const ON_ROWS_DELETE_PERMANENT = 'ON_ROWS_DELETE_PERMANENT';
const ON_ROWS_RECOVER = 'ON_ROWS_RECOVER';
const CLEAR_FILTERS = 'CLEAR_FILTERS';
const COLUMN_SORT_CHANGE = 'COLUMN_SORT_CHANGE';

const UPDATE_RECORD_VALUES = 'UPDATE_RECORD_VALUES';
const CREATE_RECORD = 'CREATE_RECORD';
const STORE_RECORD = 'STORE_RECORD';

const TOGGLE_COLUMN_VISIBLE = 'TOGGLE_COLUMN_VISIBLE';
const SET_HIDDEN_COLUMNS = 'SET_HIDDEN_COLUMNS';

const ON_FILTER_PRESET_ADD = 'ON_FILTER_PRESET_ADD';
const ON_FILTER_PRESET_DELETE = 'ON_FILTER_PRESET_DELETE';

let loadTimeout = null;

export const closeError =
  ({ sourceName }) =>
  (errorIndex) => ({
    type: dispatchType(sourceName, ON_ERROR_CLOSE),
    payload: errorIndex,
  });

export const onRowsSelect =
  ({ sourceName }) =>
  (allRowsSelected) => ({
    type: dispatchType(sourceName, ON_ROW_SELECT),
    payload: allRowsSelected,
  });

export const onFilterPresetAdd =
  ({ sourceName }) =>
  (preset) => ({
    type: dispatchType(sourceName, ON_FILTER_PRESET_ADD),
    payload: preset,
  });

export const onFilterPresetDelete =
  ({ sourceName }) =>
  (presetIndex) => ({
    type: dispatchType(sourceName, ON_FILTER_PRESET_DELETE),
    payload: presetIndex,
  });

export const load =
  ({
    sourceName,
    dataURL,
    getDataUrl,
    method = 'GET',
    requestData = {},
    getQueryBody,
  }) =>
  () =>
  (dispatch) => {
    const dataTable = store.getState()[sourceName];

    // remove filtered param from request
    delete dataTable?.filters?.filtered;

    const url = (getDataUrl || composeUrl)(dataURL, dataTable);

    let request;

    switch (method) {
      case 'POST': {
        const requestBody = getQueryBody
          ? getQueryBody(dataTable)
          : requestData;
        request = api.post(
          url,
          requestBody,
          dispatchType(sourceName, GET_LIST),
          dispatch,
        );
        break;
      }
      case 'GET':
      default:
        request = api.get(url, dispatchType(sourceName, GET_LIST), dispatch);
    }

    return request.catch((error) => {
      Sentry.captureException(error);
      return error;
    });
  };

export const onChangePage =
  (model) =>
  (currentPage, forceLoad = true, timeout = true) =>
  (dispatch) => {
    dispatch({
      type: dispatchType(model.sourceName, ON_CHANGE_PAGE),
      payload: currentPage + 1,
    });

    clearTimeout(loadTimeout);

    loadTimeout = setTimeout(
      () => forceLoad && load(model)()(dispatch),
      timeout ? 500 : 0,
    );
  };

export const onChangeRowsPerPage =
  (model) =>
  (numberOfRows, forceLoad = true) =>
  (dispatch) => {
    dispatch({
      type: dispatchType(model.sourceName, ON_CHANGE_ROWS_PER_PAGE),
      payload: numberOfRows,
    });

    return forceLoad && load(model)()(dispatch);
  };

export const onSearchChange =
  (model) =>
  (searchText, forceLoad = true, searchKeys) =>
  (dispatch) => {
    const { sourceName, searchFilterField = 'name' } = model;
    const dataTable = store.getState()[sourceName];

    dispatch({
      type: dispatchType(sourceName, ON_FILTER_CHANGE),
      payload: {
        ...dataTable.filters,
        [searchFilterField]: searchText,
        searchKeys,
      },
    });

    return forceLoad && load(model)()(dispatch);
  };

export const onFilterChange =
  (model) =>
  (filters, forceLoad = true) =>
  (dispatch) => {
    const { sourceName } = model;

    dispatch({
      type: dispatchType(sourceName, ON_FILTER_CHANGE),
      payload: { ...filters },
    });

    return forceLoad && load(model)()(dispatch);
  };

export const isRowSelectable = () => (item) => () => !item.finished;

const getURL = (model, useQueryParams = true) => {
  const dataTable = store.getState()[model.sourceName];
  const getUrlFunc = model.getDataUrl || model.composeUrl;
  const url = getUrlFunc
    ? getUrlFunc(model.dataURL, dataTable, useQueryParams)
    : model.dataURL;
  return url;
};

export const onRowsDelete =
  (model) =>
  (rowsDeleted, forceLoad = true) =>
  (dispatch) =>
    promiseChain(
      rowsDeleted.map(
        (rowId) => () =>
          api.del(
            [getURL(model, false), rowId].join('/'),
            {},
            dispatchType(model.sourceName, ON_ROWS_DELETE),
            dispatch,
          ),
      ),
    )
      .then(() => forceLoad && load(model)()(dispatch))
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const onRowsDeletePermanent =
  (model) =>
  (rowsDeleted, forceLoad = true) =>
  (dispatch) =>
    promiseChain(
      rowsDeleted.map(
        (rowId) => () =>
          api.del(
            [getURL(model, false), rowId, 'permanent'].join('/'),
            {},
            dispatchType(model.sourceName, ON_ROWS_DELETE_PERMANENT),
            dispatch,
          ),
      ),
    )
      .then(() => forceLoad && load(model)()(dispatch))
      .catch((error) => {
        dispatch(addError(new Error('FailDeletingRows')));
        Sentry.captureException(error);
        return forceLoad && load(model)()(dispatch);
      });

export const onRowsRecover =
  (model) =>
  (rowsDeleted, forceLoad = true) =>
  (dispatch) =>
    promiseChain(
      rowsDeleted.map(
        (rowId) => () =>
          api.post(
            [getURL(model, false), rowId, 'recover'].join('/'),
            {},
            dispatchType(model.sourceName, ON_ROWS_RECOVER),
            dispatch,
          ),
      ),
    )
      .then(() => forceLoad && load(model)()(dispatch))
      .catch((error) => {
        dispatch(addError(new Error('FailRecoveringRows')));
        Sentry.captureException(error);
        return forceLoad && load(model)()(dispatch);
      });

export const onColumnSortChange =
  (model) =>
  (column, direction, forceLoad = true, hard = false) =>
  (dispatch) => {
    const { sourceName } = model;

    dispatch({
      type: dispatchType(sourceName, COLUMN_SORT_CHANGE),
      payload: { column, direction, hard },
    });

    return forceLoad && load(model)()(dispatch);
  };

export const clearFilters =
  ({ sourceName }) =>
  () => ({
    type: dispatchType(sourceName, CLEAR_FILTERS),
  });

export const updateRecordValues =
  ({ sourceName }) =>
  (rowId, data) => ({
    type: dispatchType(sourceName, UPDATE_RECORD_VALUES),
    payload: { rowId, data },
  });

export const createRecord = (model) => (data) => async (dispatch) => {
  const dataTable = store.getState()[model.sourceName];
  const url = (model.getDataUrl || model.composeUrl)(
    model.dataURL,
    dataTable,
    false,
  );
  return api
    .post(url, data, dispatchType(model.sourceName, CREATE_RECORD), dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailCreatingRecord')));
      Sentry.captureException(error);
    });
};

export const storeRecord = (model) => (rowId, data) => (dispatch) => {
  const dataTable = store.getState()[model.sourceName];
  const url = (model.getDataUrl || model.composeUrl)(
    model.dataURL,
    dataTable,
    false,
  );
  return api
    .put(
      [url, rowId].join('/'),
      data,
      dispatchType(model.sourceName, STORE_RECORD),
      dispatch,
    )
    .catch((error) => {
      if (
        error.message ===
        'AccessError: Key contains fields with allowTokens option.'
      ) {
        dispatch(addError(new Error('FailStoringRecordAllowTokens')));
      } else {
        dispatch(addError(new Error('FailStoringRecord')));
      }
      Sentry.captureException(error);
    });
};

export const toggleColumnVisible =
  ({ sourceName }) =>
  (columnName) => ({
    type: dispatchType(sourceName, TOGGLE_COLUMN_VISIBLE),
    payload: columnName,
  });

export const setHiddenColumns =
  ({ sourceName }) =>
  (columns) => ({
    type: dispatchType(sourceName, SET_HIDDEN_COLUMNS),
    payload: columns,
  });

export const setDefaultData =
  (model) =>
  ({ rowsPerPage, page }, forceLoad = true) =>
  (dispatch) => {
    if (rowsPerPage) {
      dispatch({
        type: dispatchType(model.sourceName, ON_CHANGE_ROWS_PER_PAGE),
        payload: rowsPerPage,
      });
    }

    if (page) {
      dispatch({
        type: dispatchType(model.sourceName, ON_CHANGE_PAGE),
        payload: page,
      });
    }

    return forceLoad && load(model)()(dispatch);
  };
