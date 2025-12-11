import React from 'react';
import { Link, CircularProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { FileIcon, defaultStyles } from 'react-file-icon';

import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';

const styles = {
  link: {
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    width: 22,
    display: 'flex',
    paddingLeft: 4,
  },
};

const FilePreview = ({ classes, file, handleDownloadFile }) => {
  const [busy, setBusy] = React.useState(false);
  const extension = file.name.split('.').pop();

  const onDownload = React.useCallback(async () => {
    if (!handleDownloadFile || busy) {
      return;
    }

    if (file.url || file.link) {
      window.location.href = file.url || file.link;
      return;
    }

    try {
      setBusy(true);
      const fileData = await handleDownloadFile(file);
      if (fileData instanceof Error) {
        throw fileData;
      }
      downloadBase64Attach({ fileName: file.name }, base64ToBlob(fileData));
    } catch (e) {
      // error handler
    }
    setBusy(false);
  }, [busy, file, handleDownloadFile]);

  return (
    <Link
      component="button"
      variant="body2"
      className={classes.link}
      onClick={onDownload}
      underline="hover"
    >
      <div className={classes.icon}>
        {busy ? (
          <CircularProgress size={16} />
        ) : (
          <FileIcon
            {...defaultStyles[extension]}
            size={16}
            extension={extension || 'txt'}
          />
        )}
      </div>
      {file.name}
    </Link>
  );
};

const FileListPreview = ({
  classes,
  actions: { handleDownloadFile } = {},
  value,
}) =>
  []
    .concat(value)
    .filter(Boolean)
    .map((file, key) => (
      <FilePreview
        key={key}
        file={file}
        classes={classes}
        handleDownloadFile={handleDownloadFile}
      />
    ));

export default withStyles(styles)(FileListPreview);
