import React from 'react';
import PropTypes from 'prop-types';

import DataTable from 'components/DataTable';
import useTable from 'services/dataTable/useTable';

const TableData = ({
  url,
  title,
  columns,
  pagination,
  toolbar,
  search,
  refresh,
  customizateColumns,
}) => {
  const tableProps = useTable({
    dataURL: url,
    sourceName: title || 'table-list',
    autoLoad: true,
  });

  return (
    <DataTable
      {...tableProps}
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

TableData.propTypes = {
  url: PropTypes.string.isRequired,
  columns: PropTypes.array,
  pagination: PropTypes.bool,
  toolbar: PropTypes.bool,
  search: PropTypes.bool,
  refresh: PropTypes.bool,
  customizateColumns: PropTypes.bool,
};

TableData.defaultProps = {
  columns: [],
  pagination: true,
  toolbar: true,
  search: true,
  refresh: true,
  customizateColumns: false,
};

export default TableData;
