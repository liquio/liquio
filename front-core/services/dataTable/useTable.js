import * as api from 'services/api';
import useRS from 'radioactive-state';
import _ from 'lodash/fp';

import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

import composeUrl from 'services/dataTable/composeUrl';
import dispatchType from 'services/dataTable/dispatchType';
import mapDataDefault from 'services/dataTable/mapDataDefault';

import store from 'store';
import storage from 'helpers/storage';
import promiseChain from 'helpers/promiseChain';
import { bindActionCreators } from 'redux';
import processList from 'services/processList';
import waiter from 'helpers/waitForAction';

const dataMap = {};

const GET_LIST = 'GET_LIST';
const ON_ROWS_DELETE = 'ON_ROWS_DELETE';
const ON_ROWS_DELETE_PERMANENT = 'ON_ROWS_DELETE_PERMANENT';
const ON_ROWS_RECOVER = 'ON_ROWS_RECOVER';

const initialState = {
  loading: false,
  error: null,
  count: null,
  page: 1,
  rowsPerPage: 10,
  data: null,
  rowsSelected: [],
  hiddenColumns: [],
  filters: {},
  presets: [],
  search: '',
  sort: {},
};

let loadTimeout = null;

const useTable = (
  {
    sourceName,
    dataURL,
    getDataUrl,
    method,
    getQueryBody,
    requestData = {},
    mapData,
    autoLoad,
    searchFilterField = 'name',
    actions,
    sticky = true,
    staticData = false,
    timeout = 0,
    fetchFuncProp,
    rawFilters = false
  },
  options = {},
) => {
  const tableInitialState =
    (sticky && JSON.parse(storage.getItem('useTable' + sourceName))) ||
    initialState;
  const state = useRS(_.merge(tableInitialState, options));

  const informMessage = bindActionCreators(addMessage, store.dispatch);

  const fetchFunc = async (params = {}) => {
    const url = (getDataUrl || composeUrl)(dataURL, { ...state, ...params, rawFilters });

    if (staticData && dataMap[url]) {
      return dataMap[url];
    }

    let data;
    let error;

    switch (method) {
      case 'POST': {
        const requestBody = getQueryBody ? getQueryBody(state) : requestData;
        data = await api.post(
          url,
          requestBody,
          dispatchType(sourceName, GET_LIST),
          store.dispatch,
        );
        break;
      }
      case 'GET':
      default:
        data = await api
          .get(url, dispatchType(sourceName, GET_LIST), store.dispatch)
          .catch((e) => {
            error = e.message;
          });
        break;
    }

    if (error) {
      informMessage(new Message(error, 'error'));
    }

    if (staticData) {
      dataMap[url] = data;
    }

    if (options.onLoad && typeof options.onLoad === 'function') {
      options.onLoad(data);
    }

    return data;
  };

  const load = async () => {
    try {
      state.loading = true;
      const result = fetchFuncProp
        ? await fetchFuncProp(state)
        : await fetchFunc();
      Object.assign(state, (mapData || mapDataDefault)(result, state));
      state.loading = false;
      sticky &&
        storage.setItem(
          'useTable' + sourceName,
          JSON.stringify({ ...state, data: null, error: null }),
        );
    } catch (e) {
      state.error = e.message;
      state.loading = false;
      state.data = [];
    }
  };

  const loadAllDataRequests = (additional = {}) => {
    const rowsPerPage = additional.rowsPerPage || state.rowsPerPage;
    const fetch = fetchFuncProp ? fetchFuncProp : fetchFunc;
    return Array(Math.ceil(state.count / rowsPerPage))
      .fill(null)
      .map(
        (n, page) => () =>
          fetch({
            ...additional,
            rowsPerPage: state.rowsPerPage,
            page: page + 1,
          }),
      );
  };

  const getURL = (useQueryParams = true) => {
    const getUrlFunc = getDataUrl || composeUrl;
    return getUrlFunc ? getUrlFunc(dataURL, state, useQueryParams) : dataURL;
  };

  const onRowsDelete = async (
    rowsDeleted,
    forceLoad = true,
    permanent = false,
  ) => {
    try {
      state.loading = true;
      await promiseChain(
        rowsDeleted.map((rowId) => () => {
          const deleteParams = [getURL(false), rowId];
          if (permanent) {
            deleteParams.push('permanent');
          }

          const actionType = permanent
            ? ON_ROWS_DELETE_PERMANENT
            : ON_ROWS_DELETE;
          return api.del(
            deleteParams.join('/'),
            {},
            dispatchType(sourceName, actionType),
            store.dispatch,
          );
        }),
      );
      state.loading = false;
      forceLoad && load();
    } catch (e) {
      state.loading = false;
    }
  };

  const onRowsRecover = async (rowsDeleted, forceLoad = true) => {
    try {
      state.loading = true;
      await promiseChain(
        rowsDeleted.map(
          (rowId) => () =>
            api.post(
              [getURL(false), rowId, 'recover'],
              {},
              dispatchType(sourceName, ON_ROWS_RECOVER),
              store.dispatch,
            ),
        ),
      );
      state.loading = false;
      forceLoad && load();
    } catch (e) {
      state.loading = false;
    }
  };

  if (autoLoad && !state.data && !state.error && !state.loading) {
    processList.hasOrSet('useTable' + sourceName, () => {
      waiter.addAction('useTable' + sourceName, load, timeout);
    });
  }

  const endPointActions = Object.keys(actions || {}).reduce(
    (acc, action) => ({
      ...acc,
      [action]: bindActionCreators(actions[action], store.dispatch),
    }),
    {},
  );

  return {
    ...state,
    search: state.filters[searchFilterField],
    actions: {
      load,
      loadAllDataRequests,
      closeError: () => {
        state.error = null;
      },
      onRowUpdate: (rowId, rowData) => {
        state.data[rowId] = rowData;
      },
      onRowsSelect: (allRowsSelected) => {
        state.rowsSelected = allRowsSelected;
      },
      onChangePage: (currentPage, forceLoad = true) => {
        state.page = currentPage + 1;

        clearTimeout(loadTimeout);

        loadTimeout = setTimeout(() => forceLoad && load(), 500);
      },
      onChangeRowsPerPage: (numberOfRows, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        state.page = 1;
        forceLoad && load();
      },
      onSearchChange: (searchText, forceLoad = true, searchKeys) => {
        const oldSearch = state.filters[searchFilterField];
        if (searchText === oldSearch || (!searchText && !oldSearch)) {
          return;
        }
        state.filters = {
          ...state.filters,
          [searchFilterField]: searchText,
          searchKeys,
        };
        state.page = 1;
        state.rowsSelected = [];

        forceLoad && load();
      },
      onFilterChange: (filters, forceLoad = true) => {
        state.filters = filters;
        state.page = 1;
        state.rowsSelected = [];
        forceLoad && load();
      },
      onRowsDelete,
      onRowsDeletePermanent: (rowsDeleted, forceLoad) =>
        onRowsDelete(rowsDeleted, forceLoad, true),
      onRowsRecover,
      onColumnSortChange: (column, direction, forceLoad = true) => {
        state.sort = { [column]: direction };
        forceLoad && load();
      },
      clearFilters: () => {
        Object.assign(state, initialState);
      },
      toggleColumnVisible: (columnName) => {
        if (state.hiddenColumns.includes(columnName)) {
          state.hiddenColumns.splice(
            state.hiddenColumns.indexOf(columnName),
            1,
          );
        } else {
          state.hiddenColumns.push(columnName);
        }
      },
      setHiddenColumns: (columns) => {
        state.hiddenColumns = columns;
      },
      onFilterPresetAdd: (preset) => {
        state.presets = [].concat(state.presets, preset);
      },
      onFilterPresetDelete: (presetIndex) => {
        state.presets = state.presets.filter(
          (preset, index) => index !== presetIndex,
        );
      },
      ...endPointActions,
    },
  };
};

export default useTable;
