import React from 'react';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';

const styles = (theme) => ({
  title: {
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
    },
  },
});

const FieldValue = ({ children, classes, style }) => (
  <Typography
    className={classes.title}
    style={{ marginBottom: 13, ...style }}
    variant={'body2'}
  >
    {children}
  </Typography>
);

FieldValue.propTypes = {
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  style: PropTypes.object,
};

FieldValue.defaultProps = {
  children: null,
  style: {},
};
const styled = withStyles(styles)(FieldValue);
export default styled;
