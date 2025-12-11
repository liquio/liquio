import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Divider } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

const styles = (theme) => ({
  divider: {
    margin: '40px 0',
    [theme.breakpoints.down('lg')]: {
      margin: '20px 0',
    },
  },
  noMargin: {
    margin: 0,
  },
  darkTheme: {
    background: '#4E4E4E',
  },
});

const DividerElement = ({ classes, hidden, noMargin, margin, darkTheme, styles }) => {
  if (hidden) {
    return null;
  }

  const customStyles = {
    ...(margin && { margin: `${margin}px 0` }),
    ...(styles || {})
  }
  return (
    <Divider
      className={classNames(classes.root, {
        [classes.divider]: true,
        [classes.noMargin]: noMargin,
        [classes.darkTheme]: darkTheme,
      })}
      style={customStyles}
    />
  );
};

DividerElement.propTypes = {
  classes: PropTypes.object.isRequired,
  hidden: PropTypes.bool,
  noMargin: PropTypes.bool,
  margin: PropTypes.number,
};

DividerElement.defaultProps = {
  hidden: false,
  noMargin: false,
  margin: false,
};

export default withStyles(styles)(DividerElement);
