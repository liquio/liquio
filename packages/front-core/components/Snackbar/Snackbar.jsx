import React from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { Snackbar as Snack, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Close } from '@mui/icons-material';
import cx from 'classnames';

import snackbarContentStyle from 'variables/styles/snackbarContentStyle.jsx';

const Snackbar = ({
  classes,
  message,
  color,
  close,
  icon,
  place,
  open,
  closeNotification,
  setId,
}) => {
  let action = [];
  if (close) {
    action = [
      <IconButton
        className={classes.iconButton}
        key="close"
        aria-label="Close"
        color="inherit"
        onClick={() => closeNotification()}
        id={setId('close-button')}
        size="large"
      >
        <Close className={classes.close} />
      </IconButton>,
    ];
  }
  return (
    <Snack
      id={setId('snack')}
      anchorOrigin={{
        vertical: place.indexOf('t') === -1 ? 'bottom' : 'top',
        horizontal: `${
          place.indexOf('l') !== -1
            ? 'left'
            : `${place.indexOf('c') !== -1 ? 'center' : 'right'}`
        }`,
      }}
      open={open}
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
      action={action}
      SnackbarContentProps={{
        classes: {
          root: cx(classes.root, classes[color]),
          message: classes.message,
        },
        id: setId('content'),
      }}
    />
  );
};

Snackbar.propTypes = {
  classes: PropTypes.object.isRequired,
  message: PropTypes.node.isRequired,
  color: PropTypes.oneOf(['info', 'success', 'warning', 'danger', 'primary']),
  close: PropTypes.bool,
  icon: PropTypes.string,
  place: PropTypes.oneOf(['tl', 'tr', 'tc', 'br', 'bl', 'bc']),
  open: PropTypes.bool,
  setId: PropTypes.func,

  closeNotification: PropTypes.func.isRequired,
};

Snackbar.defaultProps = {
  setId: setComponentsId('snack-bar'),
  color: 'info',
  close: false,
  icon: '',
  place: 'tc',
  open: false,
};

export default withStyles(snackbarContentStyle)(Snackbar);
