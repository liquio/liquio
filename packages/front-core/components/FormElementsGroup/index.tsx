import React, { ReactNode } from 'react';
import { FormGroup } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

const styles = {
  root: {
    border: '#aaaaaa 1px solid',
    borderRadius: 4,
    padding: '0 10px',
    marginTop: 10,
    marginBottom: 10
  },
  label: {
    background: '#eee',
    color: 'rgba(0, 0, 0, 0.54)',
    margin: '-14px 0 0 0',
    position: 'absolute' as const,
    padding: '0 8px',
    cursor: 'default',
    border: 'rgba(0, 0, 0, 0.54) 1px solid',
    borderRadius: 3
  }
};

interface FormElementsGroupProps extends WithStyles<typeof styles> {
  label?: ReactNode;
  children?: ReactNode;
}

export default withStyles(styles)(({ classes, label, children }: FormElementsGroupProps) => (
  <FormGroup classes={{ root: classes.root }}>
    {label ? <div className={classes.label}>{label}</div> : null}
    {children}
  </FormGroup>
));
