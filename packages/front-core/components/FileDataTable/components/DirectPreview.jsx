import React from 'react';
import mime from 'mime-types';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';

import { ReactComponent as VisibilityIcon } from 'assets/img/visibility.svg';
import FileViewerDialog from 'components/FileViewerDialog';
import blobToBase64 from 'helpers/blobToBase64';

const DirectPreview = ({ url, GridActionsCellItem }) => {
  const [open, setOpen] = React.useState(false);
  const [blob, setBlob] = React.useState(false);
  const [fileType, setFileType] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const t = useTranslate('FileDataTable');

  const handleClickOpen = () => {
    setOpen(true);

    const fetchData = async () => {
      setDownloading(true);

      const response = await fetch(url);

      if (response?.status !== 200) {
        setDownloading(false);
        return;
      }

      const responseToBlob = await response.blob();

      const decodedBlob = await blobToBase64(responseToBlob);

      const extension = mime.extension(responseToBlob?.type);

      setFileType(extension);

      setBlob(decodedBlob);

      setDownloading(false);
    };

    fetchData();
  };

  const handleClose = () => setOpen(false);

  if (!url) return null;

  const fileSource = fileType === 'xlsx' ? blob : url;

  const Icon = downloading ? <CircularProgress size={24} /> : <VisibilityIcon size={24} />;

  return (
    <>
      <Tooltip title={t('Preview')}>
        {GridActionsCellItem ? (
          <GridActionsCellItem
            icon={Icon}
            label={t('DeleteFile')}
            aria-label={t('DeleteFile')}
            onClick={handleClickOpen}
          />
        ) : (
          <IconButton onClick={handleClickOpen} size="large">
            {Icon}
          </IconButton>
        )}
      </Tooltip>

      <FileViewerDialog
        darkTheme={false}
        file={fileSource}
        fileName={url}
        open={!!(open && fileType && blob)}
        extension={fileType}
        onClose={handleClose}
      />
    </>
  );
};

export default DirectPreview;
