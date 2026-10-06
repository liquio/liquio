import React from 'react';
import useRS from 'radioactive-state';
import storage from 'helpers/storage';
import _ from 'lodash/fp';

import dataFilter from 'helpers/dataFilter';
import dataSorter from 'helpers/dataSorter';
import dataSearch from 'helpers/dataSearch';
import type { DataTableRowState } from 'services/dataTable/types';

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

const identify = (row: Record<string, unknown>, index: number) => ({ ...row, id: row.id || index });

interface UseStaticTableOptions {
  sticky?: boolean;
  sourceName?: string;
  autoLoad?: boolean;
  [key: string]: unknown;
}

export default (data: unknown, options: UseStaticTableOptions = {}) => {
  const { sticky, sourceName, autoLoad = true } = options;
  const tableInitialState = (sticky && JSON.parse((storage.getItem('useTable' + sourceName) as string) || 'null')) || initialState;
  const state: DataTableRowState = useRS(_.merge(tableInitialState, options));

  const load = async (): Promise<void> => {
    if (Array.isArray(data)) {
      const filteredData = data
        .filter(Boolean)
        .map(identify)
        .filter(dataFilter(state.filters));

      const searchFilteredData = dataSearch(state.search, filteredData);
      const sortedData = searchFilteredData.sort(dataSorter(state.sort as Record<string, 'asc' | 'desc'>));
      state.count = sortedData.length;
      state.data = sortedData.slice(((state.page as number) - 1) * state.rowsPerPage, (state.page as number) * state.rowsPerPage);
    } else {
      state.data = data;
    }
  };

  const onRowsDelete = async (): Promise<void> => {};

  const onRowsRecover = async (): Promise<void> => {};

  const onRowUpdate = (index: string | number, row: unknown) => {
    (state.data as Record<string | number, unknown>)[index] = row;
  };

  React.useEffect(() => {
    load();
  }, [data]);

  if (autoLoad && !state.data) {
    load();
  }

  return {
    ...state,
    actions: {
      load,
      closeError: () => {
        state.error = null;
      },
      onRowsSelect: (allRowsSelected: unknown[]) => {
        state.rowsSelected = allRowsSelected;
      },
      onChangePage: (currentPage: number, forceLoad = true) => {
        state.page = currentPage + 1;
        forceLoad && load();
      },
      onChangeRowsPerPage: (numberOfRows: number, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        forceLoad && load();
      },
      onSearchChange: (searchText: string, forceLoad = true) => {
        if (state.search === searchText || (!searchText && !state.search)) {
          return;
        }

        state.search = searchText;
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
      onRowsDeletePermanent: (_rowsDeleted?: unknown[], _forceLoad?: boolean) => onRowsDelete(),
      onRowsRecover,
      onRowUpdate,
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
      }
    }
  };
};
