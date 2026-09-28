import React from 'react';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = (theme: Record<string, unknown>) => ({
  chip: {
    marginLeft: 8,
    marginTop: 1,
    marginBottom: 1,
    background: theme.chipColor,
    borderRadius: 16,
    border: 'none',
    '& span': {
      color: theme.iconButtonFill
    }
  }
});

interface FilterChipProps {
  classes: Record<string, string>;
  label?: React.ReactNode;
  [key: string]: unknown;
}

const FilterChip = ({ classes, ...rest }: FilterChipProps) => (
  <Chip {...(rest as Record<string, unknown>)} key={rest?.label as React.Key} className={classes.chip} />
);

export default withStyles(styles as never)(FilterChip as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
