import React from 'react';
import classNames from 'classnames';
import { Typography } from '@mui/material';

import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
  cell: {
    whiteSpace: 'normal !important',
    verticalAlign: 'middle',
    textAlign: 'center',
    wordBreak: 'break-word',
    color: 'rgb(0, 0, 0) !important',
    borderColor: '#E8EEF2 !important',
    backgroundColor: '#e8eef2 !important',
    lineHeight: 1.4,
  },
  value: {
    fontSize: 16,
    lineHeight: '24px',
  },
});

interface HeaderCellData {
  label?: React.ReactNode;
  colspan?: number;
  rowSpan?: number;
  headHorizontalAlign?: string;
}

interface HeaderCellProps {
  cell: HeaderCellData | string;
  cellKey?: number;
  headAlign?: string;
}

const HeaderCell = ({ cell, cellKey, headAlign }: HeaderCellProps) => {
  const classes = useStyles();
  const cellData = cell as HeaderCellData;

  return (
    <th
      key={cellKey}
      className={classNames('cell read-only', classes.cell)}
      colSpan={cellData.colspan}
      rowSpan={cellData.rowSpan}
      style={{
        verticalAlign: headAlign || 'middle',
        fontSize: 12,
        textAlign: (cellData.headHorizontalAlign as never) || 'left',
        padding: '4px',
      }}
    >
      <Typography component="div" className={classes.value}>
        {cellData.label || (cell as React.ReactNode)}
      </Typography>
    </th>
  );
};

export default HeaderCell;
