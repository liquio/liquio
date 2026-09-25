import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';
import { ReactComponent as KeyIcon } from 'assets/img/ic_key.svg';

const styles = () => ({
  btn: {
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  }
});

interface FileItem {
  fileName?: string;
  name?: string;
  [key: string]: unknown;
}

interface DownloadP7SFileProps {
  item: FileItem;
  t: (key: string, params?: Record<string, unknown>) => string;
  handleDownloadFile: (item: FileItem, asics: boolean, p7s: boolean) => Promise<string | undefined>;
  classes: Record<string, string>;
  onPreviewError?: (isError: boolean, stage: string) => void;
}

const DownloadP7SFile = ({ item, t, handleDownloadFile, classes, onPreviewError }: DownloadP7SFileProps) => {
  const [loading, setLoading] = React.useState(false);

  const handleDownload = async () => {
    if (loading) return;

    const fileName = item.fileName || item.name || t('IsGenerated');

    setLoading(true);

    const document = await handleDownloadFile(item, false, true);

    onPreviewError && onPreviewError(typeof document === 'undefined', 'download');

    setLoading(false);

    document &&
      downloadBase64Attach(
        {
          fileName: fileName + '.p7s'
        },
        base64ToBlob(document)
      );
  };

  const icon = loading ? <CircularProgress size={24} /> : <KeyIcon />;

  return (
    <Tooltip title={t('DownloadFileP7S')}>
      <IconButton onClick={handleDownload} size="large" className={classes.btn}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};

const styled = withStyles(styles)(DownloadP7SFile as never);
export default translate('WorkflowPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
