import React from 'react';
import withStyles from '@mui/styles/withStyles';
/**/
import Snackbar from 'components/Snackbars/Snackbar';
/**/
const styles = {
  root: {
    top: 4,
    right: 0,
    position: 'fixed',
    zIndex: 5000,
    maxWidth: 400,
    width: '100%',
  },
};

const Snackbars = ({ classes, errors, onClose }) => (
  <div className={classes.root}>
    {(errors || []).map((error, index) => (
      <Snackbar key={index} error={error} onClose={onClose(index)} />
    ))}
  </div>
);

export default withStyles(styles)(Snackbars);
