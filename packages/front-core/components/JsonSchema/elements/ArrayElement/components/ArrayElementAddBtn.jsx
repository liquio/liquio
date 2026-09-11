import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  buttonMargin: {
    marginBottom: 10,
  },
};

const ArrayElementAddBtn = ({
  classes,
  handleAddItem,
  addItemText,
  disabled,
}) => (
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

ArrayElementAddBtn.propTypes = {
  classes: PropTypes.object.isRequired,
  handleAddItem: PropTypes.func,
  addItemText: PropTypes.string,
};

ArrayElementAddBtn.defaultProps = {
  handleAddItem: () => null,
  addItemText: '',
};

export default withStyles(styles)(ArrayElementAddBtn);
