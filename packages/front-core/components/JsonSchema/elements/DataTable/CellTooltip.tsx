import React from 'react';

import { makeStyles } from '@mui/styles';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';
import { Theme } from '@mui/material/styles';

const useStyles = makeStyles((theme: Theme) => ({
  tooltip: {
    backgroundColor: '#ffffff',
    color: '#000000',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(16),
    border: '1px solid #000000',
    borderRadius: 0,
  },
}));

interface CellTooltipProps extends Partial<Omit<TooltipProps, 'title' | 'children'>> {
  title?: React.ReactNode;
  children: React.ReactElement;
}

const CellTooltip = ({ title, children, ...props }: CellTooltipProps) => {
  const classes = useStyles();

  if (!title) {
    return children;
  }

  return (
    <Tooltip {...(props as TooltipProps)} title={title} classes={classes}>
      {children}
    </Tooltip>
  );
};

export default CellTooltip;
