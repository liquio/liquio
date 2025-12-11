import React from 'react';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';

const styles = (theme) => ({
  title: {
    [theme.breakpoints.down('md')]: {
      fontSize: 10,
    },
  },
});

const FieldName = ({ children, classes, style }) => (
  <Typography
    className={classes.title}
    color={'textSecondary'}
    style={{ letterSpacing: '-0.02em', ...style }}
    variant={'caption'}
  >
    {children}
  </Typography>
);

FieldName.propTypes = {
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  style: PropTypes.object,
};

FieldName.defaultProps = {
  children: null,
  style: {},
};

const styled = withStyles(styles)(FieldName);
export default styled;
