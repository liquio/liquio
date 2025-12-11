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

const HeaderCell = ({ cell, cellKey, headAlign }) => {
  const classes = useStyles();

  return (
    <th
      key={cellKey}
      className={classNames('cell read-only', classes.cell)}
      colSpan={cell.colspan}
      rowSpan={cell.rowSpan}
      style={{
        verticalAlign: headAlign || 'middle',
        fontSize: 12,
        textAlign: cell.headHorizontalAlign || 'left',
        padding: '4px',
      }}
    >
      <Typography component="div" className={classes.value}>
        {cell.label || cell}
      </Typography>
    </th>
  );
};

export default HeaderCell;
