import React from 'react';
import { Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

const styles = {
  buttonMargin: {
    marginBottom: 10,
  },
};

interface ArrayElementAddBtnProps extends WithStyles<typeof styles> {
  handleAddItem?: () => void;
  addItemText?: string;
  disabled?: boolean;
}

const ArrayElementAddBtn = ({
  classes,
  handleAddItem = () => null,
  addItemText = '',
  disabled,
}: ArrayElementAddBtnProps) => (
  <Button
    variant="contained"
    disabled={disabled}
    color="primary"
    className={classes.buttonMargin}
    onClick={handleAddItem}
    aria-label={addItemText}
  >
    {addItemText}
  </Button>
);

export default withStyles(styles)(ArrayElementAddBtn);
