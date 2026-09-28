import React from 'react';
import { Link, CircularProgress } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
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

interface FileLike {
  name: string;
  url?: string;
  link?: string;
  [key: string]: unknown;
}

interface FilePreviewProps extends WithStyles<typeof styles> {
  file: FileLike;
  handleDownloadFile?: (file: FileLike) => Promise<unknown>;
}

const FilePreview = ({ classes, file, handleDownloadFile }: FilePreviewProps) => {
  const [busy, setBusy] = React.useState(false);
  const extension = file.name.split('.').pop();

  const onDownload = React.useCallback(async () => {
    if (!handleDownloadFile || busy) {
      return;
    }

    if (file.url || file.link) {
      window.location.href = (file.url || file.link) as string;
      return;
    }

    try {
      setBusy(true);
      const fileData = await handleDownloadFile(file);
      if (fileData instanceof Error) {
        throw fileData;
      }
      downloadBase64Attach({ fileName: file.name }, base64ToBlob(fileData as string));
    } catch {
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
            {...defaultStyles[extension as string]}
            size={16}
            extension={extension || 'txt'}
          />
        )}
      </div>
      {file.name}
    </Link>
  );
};

interface FileListPreviewProps extends WithStyles<typeof styles> {
  actions?: { handleDownloadFile?: (file: FileLike) => Promise<unknown> };
  value: FileLike | FileLike[];
}

const FileListPreview = ({
  classes,
  actions: { handleDownloadFile } = {},
  value,
}: FileListPreviewProps) => (
  <>
    {([] as FileLike[])
      .concat(value)
      .filter(Boolean)
      .map((file, key) => (
        <FilePreview
          key={key}
          file={file}
          classes={classes}
          handleDownloadFile={handleDownloadFile}
        />
      ))}
  </>
);

export default withStyles(styles)(FileListPreview);
