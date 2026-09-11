import React from 'react';
import PropTypes from 'prop-types';
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
import CloseIcon from '@mui/icons-material/Close';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import ProgressLine from 'components/Preloader/ProgressLine';
import classNames from 'classnames';

const withMobileDialog = () => (WrappedComponent) => (props) => (
  <WrappedComponent {...props} width="lg" fullScreen={false} />
);

const styles = (theme) => ({
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

const ConfirmDialog = ({
  open,
  loading,
  title,
  description,
  handleClose,
  handleConfirm,
  cancelButtonText,
  acceptButtonText,
  t,
  classes,
  children,
  disabled,
  acceptButtonDisabled,
  hideClose
}) => {
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
            classes={classes.progressLineWrapper}
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

ConfirmDialog.propTypes = {
  handleClose: PropTypes.func,
  handleConfirm: PropTypes.func,
  open: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  title: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  loading: PropTypes.bool,
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  acceptButtonDisabled: PropTypes.bool
};
ConfirmDialog.defaultProps = {
  handleClose: undefined,
  title: '',
  description: '',
  handleConfirm: null,
  loading: false,
  darkTheme: false,
  disabled: false,
  acceptButtonDisabled: false
};

const translated = translate('Elements')(ConfirmDialog);
const styled = withStyles(styles)(translated);

export default withMobileDialog()(styled);
