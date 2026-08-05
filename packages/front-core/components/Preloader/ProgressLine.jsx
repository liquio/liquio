import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { LinearProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    height: 2,
    zIndex: 1300,
    marginBottom: -2,
    width: '100%',
  },
  progress: {
    height: 2,
  },
};

const ProgressLine = ({ classes, loading, style, classCustom }) => (
  <div className={classNames(classes.root, classCustom)} style={style}>
    {loading ? <LinearProgress className={classes.progress} aria-label={loading}/> : null}
  </div>
);

ProgressLine.propTypes = {
  loading: PropTypes.bool,
  classes: PropTypes.object.isRequired,
  classCustom: PropTypes.string.isRequired,
  style: PropTypes.object,
};
ProgressLine.defaultProps = {
  loading: false,
  style: null,
  classCustom: '',
};

export default withStyles(styles)(ProgressLine);
