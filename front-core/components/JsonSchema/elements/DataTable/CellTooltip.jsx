import React from 'react';

import { makeStyles } from '@mui/styles';
import Tooltip from '@mui/material/Tooltip';

const useStyles = makeStyles((theme) => ({
  tooltip: {
    backgroundColor: '#ffffff',
    color: '#000000',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(16),
    border: '1px solid #000000',
    borderRadius: 0,
  },
}));

const CellTooltip = ({ title, children, ...props }) => {
  const classes = useStyles();

  if (!title) {
    return children;
  }

  return (
    <Tooltip {...props} title={title} classes={classes}>
      {children}
    </Tooltip>
  );
};

export default CellTooltip;
