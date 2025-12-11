import React from 'react';
import useRS from 'radioactive-state';
import storage from 'helpers/storage';
import _ from 'lodash/fp';

import dataFilter from 'helpers/dataFilter';
import dataSorter from 'helpers/dataSorter';
import dataSearch from 'helpers/dataSearch';

const initialState = {
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

const identify = (row, index) => ({ ...row, id: row.id || index });

export default (data, options = {}) => {
  const { sticky, sourceName, autoLoad = true } = options;
  const tableInitialState =
    (sticky && JSON.parse(storage.getItem('useTable' + sourceName))) ||
    initialState;
  const state = useRS(_.merge(tableInitialState, options));

  const load = async () => {
    if (Array.isArray(data)) {
      const filteredData = data
        .filter(Boolean)
        .map(identify)
        .filter(dataFilter(state.filters));

      const searchFilteredData = dataSearch(state.search, filteredData);
      const sortedData = searchFilteredData.sort(dataSorter(state.sort));
      state.count = sortedData.length;
      state.data = sortedData.slice(
        (state.page - 1) * state.rowsPerPage,
        state.page * state.rowsPerPage,
      );
    } else {
      state.data = data;
    }
  };

  const onRowsDelete = async (
  ) => {};

  const onRowsRecover = async () => {};

  const onRowUpdate = (index, row) => {
    state.data[index] = row;
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
      onRowsSelect: (allRowsSelected) => {
        state.rowsSelected = allRowsSelected;
      },
      onChangePage: (currentPage, forceLoad = true) => {
        state.page = currentPage + 1;
        forceLoad && load();
      },
      onChangeRowsPerPage: (numberOfRows, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        forceLoad && load();
      },
      onSearchChange: (searchText, forceLoad = true) => {
        if (state.search === searchText || (!searchText && !state.search)) {
          return;
        }

        state.search = searchText;
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
      onRowUpdate,
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
    },
  };
};
