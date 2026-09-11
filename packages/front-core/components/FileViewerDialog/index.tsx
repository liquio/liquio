import React from 'react';
import { useTranslate } from 'react-translate';
import { Dialog, IconButton } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import { ReactComponent as CloseIcon } from 'assets/img/ic_close_big.svg';
import CloseIconDark from '@mui/icons-material/Close';

import FilePreviewRaw from 'components/FilePreview';

const FilePreview = FilePreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  outlineColor?: string;
};

const styles = (theme: AppTheme) => ({
  dialog: {
    '& .ps__thumb-y': {
      background: theme?.palette?.text?.primary
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
    position: 'absolute' as const,
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
      outline: `3px solid ${theme?.outlineColor || theme?.palette?.primary?.main}`
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

interface FileViewerDialogProps {
  classes: Record<string, string>;
  open?: boolean;
  onClose: (event?: unknown) => void;
  extension: string;
  file?: string | null;
  fileName?: string;
  darkTheme?: boolean;
  withPrint?: boolean;
}

const FileViewerDialog = ({
  classes,
  open,
  onClose,
  extension,
  file,
  fileName,
  darkTheme,
  withPrint
}: FileViewerDialogProps) => {
  const t = useTranslate('Elements');

  return (
    <Dialog
      open={open as boolean}
      onClose={onClose}
      fullWidth={true}
      maxWidth={'lg'}
      scroll={'body'}
      aria-labelledby={t('Preview')}
      classes={{
        root: classes.dialog,
        paperFullWidth:
          (!['pdf', 'xlsx', 'json', 'bpmn', 'png', 'jpeg', 'jpg', 'gif', 'bmp'].includes(
            extension
          ) && classes.paperFullWidth) as unknown as string
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

FileViewerDialog.defaultProps = {
  open: false,
  file: null,
  darkTheme: false
};

export default withStyles(styles)(FileViewerDialog as never) as unknown as React.ComponentType<Record<string, unknown>>;
