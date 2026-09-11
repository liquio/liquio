import React from 'react';
import { Table } from '@devexpress/dx-react-grid-material-ui';

const TableCell = (handleClick) => (props) => {
  const editing = props?.column?.editingEnabled;
  const isFileControl = props?.column?.control === 'file';

  return (
    <Table.Cell
      {...props}
      onClick={() => {
        if (editing === false) return;
        if (isFileControl === true) return;
        handleClick(props?.row);
      }}
      style={{
        cursor: editing === false ? 'initial' : 'pointer'
      }}
    />
  );
};

export default TableCell;
