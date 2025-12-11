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
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import classNames from 'classnames';

import ProgressLine from 'components/Preloader/ProgressLine';
import CloseIcon from 'assets/img/ic_close_big.svg';
import CloseIconDark from 'assets/img/ic_close_big_white.svg';

const withMobileDialog = () => (WrappedComponent) => (props) => (
  <WrappedComponent {...props} width="lg" fullScreen={false} />
);

const styles = (theme) => ({
  contentRoot: {
    overflowY: 'visible',
    [theme.breakpoints.down('lg')]: {
      paddingLeft: 16,
      paddingRight: 16
    }
  },
  paperWidthSm: {
    padding: 46,
    paddingRight: 70,
    paddingTop: 60,
    paddingBottom: 80,
    maxWidth: 600,
    minWidth: 600,
    maxHeight: 'unset',
    [theme.breakpoints.down('lg')]: {
      padding: 5,
      margin: '40px auto!important',
      width: '95%',
      maxWidth: 'unset',
      minWidth: 'unset',
      paddingTop: 35
    }
  },
  paperScrollBody: {
    [theme.breakpoints.down('md')]: {
      maxWidth: 'calc(100% - 32px)!important',
      paddingLeft: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingTop: 40
    }
  },
  dialogActions: {
    justifyContent: 'start',
    margin: 0,
    padding: 0,
    marginTop: 20,
    paddingLeft: 24,
    [theme.breakpoints.down('lg')]: {
      marginBottom: 20
    },
    [theme.breakpoints.down('md')]: {
      marginBottom: 16,
      padding: 0,
      paddingLeft: 16
    }
  },
  closeIcon: {
    position: 'absolute',
    top: 42,
    right: 42,
    fontSize: 50,
    padding: 6,
    minWidth: 40,
    ...(theme.confirmDialogCloseIcon || {}),
    [theme.breakpoints.down('lg')]: {
      top: 7,
      right: 10
    },
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  },
  closeIconImg: {
    width: 37,
    height: 37,
    [theme.breakpoints.down('lg')]: {
      width: 25,
      height: 25
    }
  },
  dialogTitleRoot: {
    marginBottom: 20,
    paddingRight: 80,
    fontSize: '2.125rem',
    lineHeight: '1.17',
    [theme.breakpoints.down('lg')]: {
      padding: 0,
      margin: 0,
      paddingLeft: 24,
      fontSize: '26px'
    },
    [theme.breakpoints.down('md')]: {
      paddingLeft: 16,
      paddingRight: 16
    },
    '&>h6': {
      fontSize: '2.125rem',
      lineHeight: '1.17',
      [theme.breakpoints.down('lg')]: {
        fontSize: '26px'
      }
    },
    '&>h2': {
      fontSize: '2.125rem',
      lineHeight: '1.17',
      [theme.breakpoints.down('lg')]: {
        fontSize: '26px'
      }
    }
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
  reducedWrapperHorizontalPadding: {
    paddingLeft: 16,
    paddingRight: 16
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
  darkTheme,
  disabled,
  shouldReduceDialogPadding,
  hideClose
}) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      classes={{
        root: classes.dialogRoot,
        paperWidthSm: classNames(classes.paperWidthSm, {
          [classes.reducedWrapperHorizontalPadding]: shouldReduceDialogPadding
        }),
        paperScrollBody: classes.paperScrollBody
      }}
      scroll="body"
    >
      {handleClose && !hideClose ? (
        <IconButton onClick={handleClose} className={classes.closeIcon} tabIndex={0}>
          <img
            src={darkTheme ? CloseIconDark : CloseIcon}
            alt={t('Cancel')}
            className={classes.closeIconImg}
          />
        </IconButton>
      ) : null}
      {title ? (
        <DialogTitle classes={{ root: classes.dialogTitleRoot }} tabIndex={0}>
          {title}
        </DialogTitle>
      ) : null}
      <DialogContent classes={{ root: classes.contentRoot }}>
        <DialogContentText component="div">
          {description ? <Typography tabIndex={0}>{description}</Typography> : null}
          {children || null}
          <ProgressLine loading={loading} classes={classes.progressLineWrapper} />
        </DialogContentText>
      </DialogContent>
      <DialogActions classes={{ root: classes.dialogActions }}>
        {handleClose ? (
          <Button
            onClick={handleClose}
            disabled={disabled}
            variant={disabled ? 'contained' : 'outlined'}
            color="primary"
            id="cancel-btn"
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
            disabled={disabled}
            autoFocus={true}
            id="accept-btn"
            className={classNames({
              [classes.acceptButton]: true,
              [classes.removePadding]: !handleClose
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
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  loading: PropTypes.bool,
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  shouldReduceDialogPadding: PropTypes.bool
};
ConfirmDialog.defaultProps = {
  handleClose: false,
  title: '',
  description: '',
  handleConfirm: null,
  loading: false,
  darkTheme: false,
  disabled: false,
  shouldReduceDialogPadding: false
};

const translated = translate('Elements')(ConfirmDialog);
const styled = withStyles(styles)(translated);

export default withMobileDialog()(styled);
