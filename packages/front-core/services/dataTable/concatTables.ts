import useRS from 'radioactive-state';
import _ from 'lodash/fp';

const tableInitialState = {
  page: 1,
  rowsPerPage: 10,
  rowsSelected: [] as unknown[],
  hiddenColumns: [] as string[],
  filters: {} as Record<string, unknown>,
  presets: [] as unknown[],
  search: '',
  sort: {} as Record<string, unknown>
};

interface TableProp {
  loading?: boolean;
  error?: unknown;
  count?: number;
  data?: unknown[];
  actions: {
    load: () => void;
    loadAllDataRequests: () => void;
    closeError: () => void;
    onRowUpdate: (rowIndex: number, rowData: unknown) => void;
    onChangePage: (currentPage: number, forceLoad?: boolean) => void;
    onChangeRowsPerPage: (numberOfRows: number, forceLoad?: boolean) => void;
    onSearchChange: (searchText: string, forceLoad?: boolean, searchKeys?: unknown) => void;
    onFilterChange: (filters: Record<string, unknown>, forceLoad?: boolean) => void;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ConcatTablesOptions {
  searchFilterField?: string;
  [key: string]: unknown;
}

export default (tablePropList: TableProp[], options?: ConcatTablesOptions) => {
  const state = useRS(_.merge(tableInitialState, options));

  const { searchFilterField = 'name' } = options || {};

  const loading = tablePropList.some(({ loading }) => loading);
  const error = tablePropList.map(({ error }) => error).filter(Boolean)[0];
  const count = tablePropList.reduce((acc, { count }) => acc + (count || 0), 0);

  const data = loading
    ? null
    : ([] as unknown[]).concat(
        ...tablePropList.map((props, index) => {
          const firstRowIndex = tablePropList.slice(0, index).reduce((acc, { count }) => acc + (count || 0), 0);

          const start = (state.page - 1) * state.rowsPerPage - firstRowIndex;
          const end = start + state.rowsPerPage;
          return (props.data || []).slice(start, end).filter(Boolean);
        })
      );

  console.log('data', data);

  return {
    loading,
    error,
    count,
    page: state.page,
    rowsPerPage: state.rowsPerPage,
    data,
    rowsSelected: [] as unknown[],
    hiddenColumns: [] as string[],
    filters: {} as Record<string, unknown>,
    presets: [] as unknown[],
    search: '',
    sort: {} as Record<string, unknown>,
    // `load` and `loadAllDataRequests` below are NOT callable: `.forEach()` runs eagerly at
    // object-construction time (i.e. on every render) and its return value (`undefined`)
    // becomes the property, unlike `closeError` right below, which correctly wraps the same
    // pattern in a function. Preserved as-is — this concatTables module has no confirmed
    // consumers to verify against.
    actions: {
      load: tablePropList.forEach((prop) => prop.actions.load()),
      loadAllDataRequests: tablePropList.forEach((prop) => prop.actions.loadAllDataRequests()),
      closeError: () => tablePropList.forEach((prop) => prop.actions.closeError()),
      onRowUpdate: (rowId: number, rowData: unknown) => {
        tablePropList.forEach((prop, index) => {
          const firstRowIndex = tablePropList.slice(0, index).reduce((acc, { count }) => acc + (count || 0), 0);
          const rowIndex = rowId - firstRowIndex;
          if (rowIndex >= 0 && rowIndex < (prop.count as number)) {
            prop.actions.onRowUpdate(rowIndex, rowData);
          }
        });
      },
      // onRowsSelect: allRowsSelected => {
      //     state.rowsSelected = allRowsSelected;
      // },
      onChangePage: (currentPage: number, forceLoad = true) => {
        state.page = currentPage + 1;

        tablePropList.forEach((prop, index) => {
          const firstRowIndex = tablePropList.slice(0, index).reduce((acc, { count }) => acc + (count || 0), 0);
          const rowIndex = (currentPage - 1) * state.rowsPerPage - firstRowIndex;
          if (rowIndex >= 0 && rowIndex < (prop.count as number)) {
            prop.actions.onChangePage(currentPage, forceLoad);
          }
        });
      },
      onChangeRowsPerPage: (numberOfRows: number, forceLoad = true) => {
        state.rowsPerPage = numberOfRows;
        tablePropList.forEach((prop) => prop.actions.onChangeRowsPerPage(numberOfRows, forceLoad));
      },
      onSearchChange: (searchText: string, forceLoad = true, searchKeys?: unknown) => {
        const oldSearch = (state.filters as Record<string, unknown>)[searchFilterField];
        if (searchText === oldSearch || (!searchText && !oldSearch)) {
          return;
        }
        state.filters = {
          ...(state.filters as Record<string, unknown>),
          [searchFilterField]: searchText,
          searchKeys
        };
        tablePropList.forEach((prop) => prop.actions.onSearchChange(searchText, forceLoad, searchKeys));
      },
      onFilterChange: (filters: Record<string, unknown>, forceLoad = true) => {
        state.filters = filters;
        state.page = 1;
        state.rowsSelected = [];
        tablePropList.forEach((prop) => prop.actions.onFilterChange(filters, forceLoad));
      }
    }
  };
};
