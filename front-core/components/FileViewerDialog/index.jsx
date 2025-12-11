import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { Dialog, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { ReactComponent as CloseIcon } from 'assets/img/ic_close_big.svg';
import CloseIconDark from '@mui/icons-material/Close';

import FilePreview from 'components/FilePreview';

const styles = (theme) => ({
  dialog: {
    '& .ps__thumb-y': {
      background: '#000'
    }
  },
  pageWrapper: {
    padding: 56,
    [theme.breakpoints.down('lg')]: {
      padding: 20,
      paddingTop: 45
    }
  },
  paperFullWidth: {
    width: 'auto'
  },
  closeIcon: {
    position: 'absolute',
    top: 7,
    right: 7,
    fontSize: 50,
    padding: 6,
    minWidth: 40,
    zIndex: 1,
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
  }
});

const FileViewerDialog = ({
  classes,
  open,
  onClose,
  extension,
  file,
  fileName,
  darkTheme,
  withPrint
}) => {
  const t = useTranslate('Elements');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={true}
      maxWidth={'lg'}
      scroll={'body'}
      aria-labelledby={t('Preview')}
      classes={{
        root: classes.dialog,
        paperFullWidth:
          !['pdf', 'xlsx', 'json', 'bpmn', 'png', 'jpeg', 'jpg', 'gif', 'bmp'].includes(
            extension
          ) && classes.paperFullWidth
      }}
    >
      <div className={classes.pageWrapper} id={t('Preview')}>
        <IconButton onClick={onClose} className={classes.closeIcon} aria-label={t('Close')}>
          {darkTheme ? (
            <CloseIconDark className={classes.closeIconImg} />
          ) : (
            <CloseIcon className={classes.closeIconImg} />
          )}
        </IconButton>
        <FilePreview
          file={file}
          fileName={fileName}
          fileType={extension}
          darkTheme={darkTheme}
          open={open}
          withPrint={withPrint}
        />
      </div>
    </Dialog>
  );
};

FileViewerDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  extension: PropTypes.string.isRequired,
  file: PropTypes.string,
  darkTheme: PropTypes.bool
};

FileViewerDialog.defaultProps = {
  open: false,
  file: null,
  darkTheme: false
};

export default withStyles(styles)(FileViewerDialog);
