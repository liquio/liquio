import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';

const DownloadFile = ({ item, t, handleDownloadFile, downloadIcon, onPreviewError }) => {
  const [loading, setLoading] = React.useState(false);

  const handleDownload = async () => {
    if (loading) return;

    const fileName = item.fileName || item.name || t('IsGenerated');

    setLoading(true);

    const document = await handleDownloadFile(item);

    onPreviewError && onPreviewError(typeof document === 'undefined', 'download');

    setLoading(false);

    document && downloadBase64Attach({ fileName }, base64ToBlob(document));
  };

  const icon = loading ? (
    <CircularProgress size={24} />
  ) : (
    downloadIcon || item.downloadIcon || <SaveAltIcon />
  );

  return (
    <Tooltip title={t('DownloadFile')}>
      <IconButton onClick={handleDownload} size="large">
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export default translate('WorkflowPage')(DownloadFile);
