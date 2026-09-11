import useRS from 'radioactive-state';
import _ from 'lodash/fp';

const tableInitialState = {
  page: 1,
  rowsPerPage: 10,
  rowsSelected: [],
  hiddenColumns: [],
  filters: {},
  presets: [],
  search: '',
  sort: {},
};

export default (tablePropList, options) => {
  const state = useRS(_.merge(tableInitialState, options));

  const { searchFilterField = 'name' } = options || {};

  const loading = tablePropList.some(({ loading }) => loading);
  const error = tablePropList.map(({ error }) => error).filter(Boolean)[0];
  const count = tablePropList.reduce((acc, { count }) => acc + (count || 0), 0);

  const data = loading
    ? null
    : [].concat(
        ...tablePropList.map((props, index) => {
          const firstRowIndex = tablePropList
            .slice(0, index)
            .reduce((acc, { count }) => acc + (count || 0), 0);

          const start = (state.page - 1) * state.rowsPerPage - firstRowIndex;
          const end = start + state.rowsPerPage;
          return (props.data || []).slice(start, end).filter(Boolean);
        }),
      );

  console.log('data', data);

  return {
    loading,
    error,
    count,
    page: state.page,
    rowsPerPage: state.rowsPerPage,
    data,
    rowsSelected: [],
    hiddenColumns: [],
    filters: {},
    presets: [],
    search: '',
    sort: {},
    actions: {
      load: tablePropList.forEach((prop) => prop.actions.load()),
      loadAllDataRequests: tablePropList.forEach((prop) =>
        prop.actions.loadAllDataRequests(),
      ),
      closeError: () =>
        tablePropList.forEach((prop) => prop.actions.closeError()),
      onRowUpdate: (rowId, rowData) => {
        tablePropList.forEach((prop, index) => {
          const firstRowIndex = tablePropList
            .slice(0, index)
            .reduce((acc, { count }) => acc + (count || 0), 0);
          const rowIndex = rowId - firstRowIndex;
          if (rowIndex >= 0 && rowIndex < prop.count) {
            prop.actions.onRowUpdate(rowIndex, rowData);
          }
        });
      },
      // onRowsSelect: allRowsSelected => {
      //     state.rowsSelected = allRowsSelected;
      // },
      onChangePage: (currentPage, forceLoad = true) => {
        state.page = currentPage + 1;

        tablePropList.forEach((prop, index) => {
          const firstRowIndex = tablePropList
            .slice(0, index)
            .reduce((acc, { count }) => acc + (count || 0), 0);
          const rowIndex =
            (currentPage - 1) * state.rowsPerPage - firstRowIndex;
          if (rowIndex >= 0 && rowIndex < prop.count) {
            prop.actions.onChangePage(currentPage, forceLoad);
          }
        });
      },
      onChangeRowsPerPage: (numberOfRows, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        tablePropList.forEach((prop) =>
          prop.actions.onChangeRowsPerPage(numberOfRows, forceLoad),
        );
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
        tablePropList.forEach((prop) =>
          prop.actions.onSearchChange(searchText, forceLoad, searchKeys),
        );
      },
      onFilterChange: (filters, forceLoad = true) => {
        state.filters = filters;
        state.page = 1;
        state.rowsSelected = [];
        tablePropList.forEach((prop) =>
          prop.actions.onFilterChange(filters, forceLoad),
        );
      },
    },
  };
};
