import React from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { SnackbarContent as Snack, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Close } from '@mui/icons-material';
import cx from 'classnames';

import snackbarContentStyle from 'variables/styles/snackbarContentStyle.jsx';

interface SnackbarContentProps {
  classes: Record<string, string>;
  message: React.ReactNode;
  color?: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  close?: boolean;
  icon?: string;
  setId?: (elementName: string) => string;
}

const SnackbarContent = ({
  classes,
  message,
  color = 'info',
  close = false,
  icon = '',
  setId = setComponentsId('snack'),
}: SnackbarContentProps) => {
  let action: React.ReactNode[] = [];
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
          {icon ? React.createElement('icon', { className: classes.icon }) : null}
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

export default withStyles(snackbarContentStyle as never)(SnackbarContent as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
