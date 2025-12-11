import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

const styles = (theme) => ({
  mainContent: {
    padding: '0 20px',
    boxSizing: 'content-box',
    [theme.breakpoints.up('sm')]: {
      padding: '0 40px',
      paddingBottom: 100,
    },
  },
  smallPadding: {
    padding: '0 16px 16px',
  },
});

const Content = ({
  children,
  className,
  classes,
  small,
  maxWidth,
  paddingBottom,
}) => (
  <main
    style={{ maxWidth, paddingBottom }}
    className={classNames(className, {
      [classes.mainContent]: true,
      [classes.smallPadding]: small,
    })}
  >
    {children}
  </main>
);

Content.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  classes: PropTypes.object.isRequired,
  small: PropTypes.bool,
  maxWidth: PropTypes.number,
};

Content.defaultProps = {
  className: '',
  small: false,
  maxWidth: '100%',
};

export default withStyles(styles)(Content);
