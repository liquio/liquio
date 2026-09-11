import React from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { SnackbarContent as Snack, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Close } from '@mui/icons-material';
import cx from 'classnames';

import snackbarContentStyle from 'variables/styles/snackbarContentStyle.jsx';

const SnackbarContent = ({ classes, message, color, close, icon, setId }) => {
  let action = [];
  if (close) {
    action = [
      <IconButton
        className={classes.iconButton}
        key="close"
        aria-label="Close"
        color="inherit"
        id={setId('close-button')}
        size="large"
      >
        <Close className={classes.close} />
      </IconButton>,
    ];
  }
  return (
    <Snack
      message={
        <div id={setId('message-wrap')}>
          {icon ? <icon className={classes.icon} /> : null}
          <span
            className={cx(icon && classes.iconMessage)}
            id={setId('message')}
          >
            {message}
          </span>
        </div>
      }
      classes={{
        root: cx(classes.root, classes[color]),
        message: classes.message,
      }}
      id={setId('content')}
      action={action}
    />
  );
};

SnackbarContent.propTypes = {
  classes: PropTypes.object.isRequired,
  message: PropTypes.node.isRequired,
  color: PropTypes.oneOf(['info', 'success', 'warning', 'danger', 'primary']),
  close: PropTypes.bool,
  icon: PropTypes.string,
  setId: PropTypes.func,
};

SnackbarContent.defaultProps = {
  setId: setComponentsId('snack'),
  color: 'info',
  close: false,
  icon: '',
};

export default withStyles(snackbarContentStyle)(SnackbarContent);
