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
import type { DataTableEndpoint, DataTableRowState } from 'services/dataTable/types';

const dataMap: Record<string, unknown> = {};

const GET_LIST = 'GET_LIST';
const ON_ROWS_DELETE = 'ON_ROWS_DELETE';
const ON_ROWS_DELETE_PERMANENT = 'ON_ROWS_DELETE_PERMANENT';
const ON_ROWS_RECOVER = 'ON_ROWS_RECOVER';

const initialState: DataTableRowState = {
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
  sort: {}
};

let loadTimeout: ReturnType<typeof setTimeout> | null = null;

interface UseTableOptions {
  onLoad?: (data: unknown) => void;
  [key: string]: unknown;
}

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
  }: DataTableEndpoint,
  options: UseTableOptions = {}
) => {
  const tableInitialState = (sticky && JSON.parse((storage.getItem('useTable' + sourceName) as string) || 'null')) || initialState;
  const state: DataTableRowState = useRS(_.merge(tableInitialState, options));

  const informMessage = bindActionCreators(addMessage, store.dispatch);

  const fetchFunc = async (params: Record<string, unknown> = {}): Promise<unknown> => {
    const url = (getDataUrl || composeUrl)(dataURL, { ...state, ...params, rawFilters });

    if (staticData && dataMap[url]) {
      return dataMap[url];
    }

    let data;
    let error;

    switch (method) {
      case 'POST': {
        const requestBody = getQueryBody ? getQueryBody(state) : requestData;
        data = await api.post(url, requestBody, dispatchType(sourceName, GET_LIST), store.dispatch as never);
        break;
      }
      case 'GET':
      default:
        data = await api.get(url, dispatchType(sourceName, GET_LIST), store.dispatch as never).catch((e: Error) => {
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

  const load = async (): Promise<void> => {
    try {
      state.loading = true;
      const result = fetchFuncProp ? await fetchFuncProp(state) : await fetchFunc();
      Object.assign(state, (mapData || mapDataDefault)(result, state));
      state.loading = false;
      sticky && storage.setItem('useTable' + sourceName, JSON.stringify({ ...state, data: null, error: null }));
    } catch (e) {
      state.error = (e as Error).message;
      state.loading = false;
      state.data = [];
    }
  };

  const loadAllDataRequests = (additional: Record<string, unknown> = {}) => {
    const rowsPerPage = (additional.rowsPerPage as number) || state.rowsPerPage;
    const fetch = fetchFuncProp ? fetchFuncProp : fetchFunc;
    return Array((state.count && Math.ceil(state.count / rowsPerPage)) || 0)
      .fill(null)
      .map((n, page) => () => fetch({ ...additional, rowsPerPage: state.rowsPerPage, page: page + 1 }));
  };

  const getURL = (useQueryParams = true): string => {
    const getUrlFunc = getDataUrl || composeUrl;
    return getUrlFunc ? getUrlFunc(dataURL, state, useQueryParams) : dataURL;
  };

  const onRowsDelete = async (rowsDeleted: Array<string | number>, forceLoad = true, permanent = false): Promise<void> => {
    try {
      state.loading = true;
      await promiseChain(
        rowsDeleted.map((rowId) => () => {
          const deleteParams = [getURL(false), rowId];
          if (permanent) {
            deleteParams.push('permanent');
          }

          const actionType = permanent ? ON_ROWS_DELETE_PERMANENT : ON_ROWS_DELETE;
          return api.del(deleteParams.join('/'), {}, dispatchType(sourceName, actionType), store.dispatch as never);
        })
      );
      state.loading = false;
      forceLoad && load();
    } catch {
      state.loading = false;
    }
  };

  const onRowsRecover = async (rowsDeleted: Array<string | number>, forceLoad = true): Promise<void> => {
    try {
      state.loading = true;
      await promiseChain(
        rowsDeleted.map((rowId) => () => api.post([getURL(false), rowId, 'recover'].join('/'), {}, dispatchType(sourceName, ON_ROWS_RECOVER), store.dispatch as never))
      );
      state.loading = false;
      forceLoad && load();
    } catch {
      state.loading = false;
    }
  };

  if (autoLoad && !state.data && !state.error && !state.loading) {
    processList.hasOrSet('useTable' + sourceName, () => {
      waiter.addAction('useTable' + sourceName, load, timeout);
    });
  }

  const endPointActions = Object.keys((actions || {}) as Record<string, unknown>).reduce(
    (acc, action) => ({
      ...acc,
      [action]: bindActionCreators((actions as Record<string, never>)[action], store.dispatch)
    }),
    {}
  );

  return {
    ...state,
    search: (state.filters as Record<string, unknown>)[searchFilterField],
    actions: {
      load,
      loadAllDataRequests,
      closeError: () => {
        state.error = null;
      },
      onRowUpdate: (rowId: string | number, rowData: unknown) => {
        (state.data as Record<string | number, unknown>)[rowId] = rowData;
      },
      onRowsSelect: (allRowsSelected: unknown[]) => {
        state.rowsSelected = allRowsSelected;
      },
      onChangePage: (currentPage: number, forceLoad = true) => {
        state.page = currentPage + 1;

        if (loadTimeout) clearTimeout(loadTimeout);

        loadTimeout = setTimeout(() => forceLoad && load(), 500);
      },
      onChangeRowsPerPage: (numberOfRows: number, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        state.page = 1;
        forceLoad && load();
      },
      onSearchChange: (searchText: string, forceLoad = true, searchKeys?: unknown) => {
        const filters = state.filters as Record<string, unknown>;
        const oldSearch = filters[searchFilterField];
        if (searchText === oldSearch || (!searchText && !oldSearch)) {
          return;
        }
        state.filters = {
          ...filters,
          [searchFilterField]: searchText,
          searchKeys
        };
        state.page = 1;
        state.rowsSelected = [];

        forceLoad && load();
      },
      onFilterChange: (filters: Record<string, unknown>, forceLoad = true) => {
        state.filters = filters;
        state.page = 1;
        state.rowsSelected = [];
        forceLoad && load();
      },
      onRowsDelete,
      onRowsDeletePermanent: (rowsDeleted: Array<string | number>, forceLoad?: boolean) => onRowsDelete(rowsDeleted, forceLoad, true),
      onRowsRecover,
      onColumnSortChange: (column: string, direction: string, forceLoad = true) => {
        state.sort = { [column]: direction };
        forceLoad && load();
      },
      clearFilters: () => {
        Object.assign(state, initialState);
      },
      toggleColumnVisible: (columnName: string) => {
        if (state.hiddenColumns.includes(columnName)) {
          state.hiddenColumns.splice(state.hiddenColumns.indexOf(columnName), 1);
        } else {
          state.hiddenColumns.push(columnName);
        }
      },
      setHiddenColumns: (columns: string[]) => {
        state.hiddenColumns = columns;
      },
      onFilterPresetAdd: (preset: unknown) => {
        state.presets = ([] as unknown[]).concat(state.presets, preset);
      },
      onFilterPresetDelete: (presetIndex: number) => {
        state.presets = state.presets.filter((preset, index) => index !== presetIndex);
      },
      ...endPointActions
    }
  };
};

export default useTable;
