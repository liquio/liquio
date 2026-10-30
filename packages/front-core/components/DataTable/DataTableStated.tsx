import React from 'react';
import { translate } from 'react-translate';

import DataTableRaw from 'components/DataTable';

interface DataTableStatedProps {
  data?: unknown[];
  isIncreasing?: boolean;
  reserIsIncreasing?: (() => void) | null;
  controls?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  [key: string]: unknown;
}

const DataTableStated = ({
  data = [],
  isIncreasing = false,
  reserIsIncreasing = null,
  controls = {
    pagination: false,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    switchView: true
  },
  actions = {},
  ...dataTableProps
}: DataTableStatedProps) => {
  // Read at call time rather than module scope: `index.tsx` re-exports this
  // file (`export { default as DataTableStated } from './DataTableStated'`),
  // so `components/DataTable` circularly imports back to this same file — a
  // module-top-level read can run while that module is still mid-evaluation
  // (see TYPESCRIPT.md's CodeEditDialog batch notes for the same bug class).
  const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const getFilteredData = () => {
    const filtereList = (data || []).filter(Boolean).filter((item) => {
      const fields = Object.values(item as Record<string, unknown>);
      const compare = (val: unknown) =>
        (val + '').toUpperCase().indexOf((search || '').toUpperCase()) !== -1;
      const exists = fields.find(compare);
      return exists;
    });

    return filtereList;
  };

  const onChangePage = (page: number) => {
    setPage(page + 1);
    reserIsIncreasing && reserIsIncreasing();
  };

  const getData = () => {
    const firstIndex = (page - 1) * rowsPerPage;
    const lastIndex = page * rowsPerPage;

    const list = getFilteredData();

    isIncreasing && page !== 1 && setPage(1);

    if (list && (list || []).length <= firstIndex) {
      const start = firstIndex - rowsPerPage;
      return {
        list: list.slice(start < 0 ? 0 : start, lastIndex - rowsPerPage),
        count: list && list.length
      };
    }

    return {
      list: list && list.slice(firstIndex, lastIndex),
      count: list && list.length
    };
  };

  const { list, count } = getData();

  return (
    <DataTable
      {...dataTableProps}
      actions={{
        ...actions,
        onChangePage,
        onSearchChange: setSearch,
        onChangeRowsPerPage: setRowsPerPage
      }}
      data={list}
      page={page}
      search={search}
      count={count}
      rowsPerPage={rowsPerPage}
      controls={controls}
    />
  );
};

export default translate('DataTableStated')(DataTableStated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
