import React, { ComponentType } from 'react';
import {
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import ProgressLine from 'components/Preloader/ProgressLine';
import classNames from 'classnames';

const withMobileDialog = () => (WrappedComponent: ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
  <WrappedComponent {...props} width="lg" fullScreen={false} />
);

type AppTheme = Theme & {
  confirmDialogCloseIcon?: Record<string, unknown>;
  confirmDialogAcceptButton?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  closeIcon: {
    ...(theme.confirmDialogCloseIcon || {}),
    marginLeft: 16,
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  },
  dialogTitleContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  dialogTitleText: {
    flex: 1
  },
  acceptButton: {
    marginLeft: '20px',
    padding: '18px 44px',
    ...(theme.confirmDialogAcceptButton || {}),
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  },
  removePadding: {
    marginLeft: 0
  },
  progressLineWrapper: {
    marginTop: 20
  },
  cancelIcon: {
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  }
});

interface ConfirmDialogProps {
  open: boolean;
  loading?: boolean;
  title?: string;
  description?: React.ReactNode;
  handleClose?: (() => void) | undefined;
  handleConfirm?: (() => void) | null;
  cancelButtonText?: string;
  acceptButtonText?: string;
  t: (key: string) => string;
  classes: Record<string, string>;
  children?: React.ReactNode;
  disabled?: boolean;
  acceptButtonDisabled?: boolean;
  hideClose?: boolean;
}

const ConfirmDialog = ({
  open,
  loading = false,
  title = '',
  description = '',
  handleClose = undefined,
  handleConfirm = null,
  cancelButtonText,
  acceptButtonText,
  t,
  classes,
  children,
  disabled = false,
  acceptButtonDisabled = false,
  hideClose
}: ConfirmDialogProps) => {
  const hasCloseHandler = typeof handleClose === 'function';
  const descriptionContent = React.isValidElement(description) ? (
    description
  ) : (
    <Typography tabIndex={0}>{description}</Typography>
  );

  return (
    <Dialog
      open={open}
      onClose={hasCloseHandler ? handleClose : undefined}
      fullWidth={true}
      maxWidth="sm"
      scroll="body"
      data-testid="confirm-dialog"
    >
      <DialogTitle tabIndex={0}>
        <div className={classes.dialogTitleContent}>
          <span className={classes.dialogTitleText}>{title}</span>
          {!hideClose && hasCloseHandler ? (
            <IconButton
              className={classes.closeIcon}
              onClick={handleClose}
              aria-label={t('Close')}
              data-testid="confirm-dialog-close"
              color="inherit"
              size="large"
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </div>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          {description ? descriptionContent : null}
          {children || null}
          <ProgressLine
            loading={loading}
            classes={classes.progressLineWrapper as unknown as { root?: string; progress?: string }}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {hasCloseHandler ? (
          <Button
            onClick={handleClose}
            disabled={disabled}
            variant={disabled ? 'contained' : 'outlined'}
            color="primary"
            id="cancel-btn"
            data-testid="confirm-dialog-cancel"
            aria-label={t('Cancel')}
            className={classes.cancelIcon}
          >
            {cancelButtonText || t('Cancel')}
          </Button>
        ) : null}
        {handleConfirm ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            disabled={disabled || acceptButtonDisabled}
            autoFocus={true}
            id="accept-btn"
            data-testid="confirm-dialog-confirm"
            className={classNames({
              [classes.acceptButton]: true,
              [classes.removePadding]: !hasCloseHandler
            })}
            aria-label={t('Accept')}
          >
            {acceptButtonText || t('Accept')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

const translated = translate('Elements')(ConfirmDialog as never);
const styled = withStyles(styles)(translated as never);

export default withMobileDialog()(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
