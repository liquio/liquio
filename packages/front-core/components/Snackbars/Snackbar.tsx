import React from 'react';
import { translate } from 'react-translate';
import store from 'store';
import classNames from 'classnames';
import { IconButton, SnackbarContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
/**/
import renderHTML from 'helpers/renderHTML';
import isCyrillic from 'helpers/isCyrillic';
import { green, amber } from '@mui/material/colors';
/**/
type AppTheme = Theme & {
  permanentWarning?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  root: {
    margin: '0 4px 4px 0',
    display: 'flex',
    alignItems: 'start',
  },
  success: {
    backgroundColor: green[600],
  },
  error: {
    backgroundColor: theme.palette.error.dark,
    color: '#fff',
  },
  info: {
    backgroundColor: theme.palette.primary.dark,
  },
  warning: {
    backgroundColor: amber[700],
  },
  permanentWarning: {
    backgroundColor: amber[700],
    ...(theme.permanentWarning || {}),
  },
  icon: {
    fontSize: 20,
  },
  iconVariant: {
    opacity: 0.9,
    marginRight: 8,
  },
  message: {
    width: 'calc(100% - 36px)',
  },
  details: {
    overflow: 'auto',
    background: '#000000',
    color: '#fff',
    padding: '2px 12px',
    marginTop: 8,
  },
  action: {
    paddingLeft: 0,
  },
});

interface SnackbarError {
  message: string;
  content?: React.ReactNode;
  variant?: string;
  details?: unknown;
  autoClose?: boolean;
  data?: Record<string, unknown> | false;
  onCloseCallBack?: () => void;
}

interface ErrorSnackbarProps {
  classes: Record<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  className?: string;
  closeDelayLong?: number;
  closeDelay?: number;
  error: SnackbarError;
  onClose: (event?: React.SyntheticEvent) => void;
}

const ErrorSnackbar = ({
  classes,
  t,
  className,
  closeDelayLong = 6000,
  closeDelay = 4000,
  error: {
    message,
    content,
    variant,
    details,
    autoClose = true,
    data = {},
    onCloseCallBack,
  },
  onClose,
}: ErrorSnackbarProps) => {
  const text = content || (isCyrillic(message) ? message : t(message, data as Record<string, unknown>));
  const longMessage = ((text as string) || '').length > 100;

  autoClose &&
    setTimeout(
      () => {
        const errors = store.getState()?.errors?.list;

        if (!errors!.length) {
          return;
        }

        if (!['default', 'error', 'permanentWarning'].includes(variant || '')) {
          onClose();
        }
      },
      longMessage ? closeDelayLong : closeDelay,
    );

  const handleClose = (e: React.SyntheticEvent) => {
    onCloseCallBack && onCloseCallBack();
    onClose(e);
  };

  return (
    <SnackbarContent
      className={classNames(
        classes.root,
        classes[variant || 'error'],
        className,
      )}
      classes={{ message: classes.message, action: classes.action }}
      aria-describedby="client-snackbar"
      message={
        <>
          {details ? (
            <span id="client-snackbar" className={classes.message}>
              {text}
              <div className={classes.details}>
                <pre>{JSON.stringify(details, null, 4)}</pre>
              </div>
            </span>
          ) : (
            <span id="client-snackbar" className={classes.message}>
              {typeof text === 'object' ? text : renderHTML(text as string)}
            </span>
          )}
        </>
      }
      action={[
        <IconButton
          key="close"
          aria-label="Close"
          color="inherit"
          className={(classes as Record<string, string>).close}
          onClick={handleClose}
        >
          <CloseIcon className={classes.icon} />
        </IconButton>,
      ]}
    />
  );
};

const styled = withStyles(styles)(ErrorSnackbar as never);

export default translate('Errors')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
