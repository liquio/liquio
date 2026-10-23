import React from 'react';

import DataTable from 'components/DataTable';
import useTable from 'services/dataTable/useTable';

interface TableDataProps {
  url: string;
  title?: string;
  columns?: unknown[];
  pagination?: boolean;
  toolbar?: boolean;
  search?: boolean;
  refresh?: boolean;
  customizateColumns?: boolean;
}

const TableData = ({
  url,
  title,
  columns = [],
  pagination = true,
  toolbar = true,
  search = true,
  refresh = true,
  customizateColumns = false,
}: TableDataProps) => {
  const tableProps = useTable({
    dataURL: url,
    sourceName: title || 'table-list',
    autoLoad: true,
  });

  return (
    <DataTable
      {...(tableProps as unknown as Record<string, unknown>)}
      // columns={[{
      //     id: 'name',
      //     name: t('Name')
      // }, {
      //     id: 'route',
      //     name: t('Route')
      // }]}
      columns={columns}
      controls={{
        pagination: pagination,
        toolbar: toolbar,
        search: search,
        header: true,
        refresh: refresh,
        switchView: false,
        customizateColumns: customizateColumns,
      }}
    />
  );
};

export default TableData;
