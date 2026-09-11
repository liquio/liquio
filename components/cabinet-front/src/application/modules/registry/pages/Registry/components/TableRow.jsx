import React from 'react';
import { Table } from '@devexpress/dx-react-grid-material-ui';

const TableRow =
  (handleClick) =>
  ({ row, ...restProps }) => (
    <Table.Row
      {...restProps}
      onClick={() => handleClick(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(row);
        }
      }}
      style={{ cursor: 'pointer' }}
    />
  );

export default TableRow;
