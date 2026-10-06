import React from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { Snackbar as Snack, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Close } from '@mui/icons-material';
import cx from 'classnames';

import snackbarContentStyle from 'variables/styles/snackbarContentStyle.jsx';

interface SnackbarProps {
  classes: Record<string, string>;
  message: React.ReactNode;
  color?: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  close?: boolean;
  icon?: string;
  place?: 'tl' | 'tr' | 'tc' | 'br' | 'bl' | 'bc';
  open?: boolean;
  closeNotification: () => void;
  setId?: (elementName: string) => string;
}

const Snackbar = ({
  classes,
  message,
  color = 'info',
  close = false,
  icon = '',
  place = 'tc',
  open = false,
  closeNotification,
  setId = setComponentsId('snack-bar'),
}: SnackbarProps) => {
  let action: React.ReactNode[] = [];
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
        }` as 'left' | 'center' | 'right',
      }}
      open={open}
      message={
        <div id={setId('message-wrap')}>
          {icon ? React.createElement('icon', { className: classes.icon }) : null}
          <span
            className={cx(icon && classes.iconMessage)}
            id={setId('message')}
          >
            {message}
          </span>
        </div>
      }
      action={action}
      {...({
        SnackbarContentProps: {
          classes: {
            root: cx(classes.root, classes[color]),
            message: classes.message,
          },
          id: setId('content'),
        },
      } as unknown as Record<string, unknown>)}
    />
  );
};

export default withStyles(snackbarContentStyle as never)(Snackbar as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
