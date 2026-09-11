import React from 'react';
import PropTypes from 'prop-types';
import { LinearProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 2,
    zIndex: 1300,
    marginBottom: -2,
  },
  progress: {
    height: 2,
  },
};

const ProgressLine = ({ classes, loading, style, ariaLabel }) => (
  <div className={classes.root} style={style}>
    {loading ? <LinearProgress aria-label={ariaLabel} className={classes.progress} /> : null}
  </div>
);

ProgressLine.propTypes = {
  loading: PropTypes.bool,
  classes: PropTypes.object.isRequired,
  style: PropTypes.object,
};

ProgressLine.defaultProps = {
  loading: false,
  style: null,
};

export default withStyles(styles)(ProgressLine);
