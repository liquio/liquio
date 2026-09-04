import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { Typography, IconButton, CircularProgress, Tooltip } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

import Message from 'components/Snackbars/Message';
import { downloadFile } from 'actions/files';
import { addMessage } from 'actions/error';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';

const styles = {
  attachmentList: {
    marginTop: 20
  },
  action: {
    marginLeft: 10
  }
};

const useStyles = makeStyles(styles);

const AttachmentElement = ({ fileId, fileName, p7sFileId, downloadToken }) => {
  const t = useTranslate('Elements');
  const dispatch = useDispatch();
  const classes = useStyles();
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (downloading) return;

    setDownloading(true);

    const document = await downloadFile(
      {
        downloadToken
      },
      false,
      p7sFileId
    )(dispatch);

    setDownloading(false);

    if (document instanceof Error || !document) {
      addMessage(new Message('FailUploadingAttachment', 'error'));
      return;
    }

    downloadBase64Attach({ fileName }, base64ToBlob(document));
  };

  return (
    <Typography key={fileId || p7sFileId}>
      {fileName}

      <Tooltip title={t('UploadFiles')}>
        <IconButton
          onClick={() => handleDownload(downloadToken)}
          className={classes.action}
          size="large"
        >
          {downloading ? <CircularProgress size={24} /> : <SaveAltIcon size={24} />}
        </IconButton>
      </Tooltip>
    </Typography>
  );
};

AttachmentElement.propTypes = {
  fileId: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  p7sFileId: PropTypes.string.isRequired,
  downloadToken: PropTypes.string.isRequired
};

const AttachmentsList = ({ attachments }) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      <Typography className={classes.attachmentList}>{t('Attachments')}</Typography>
      {attachments.map(({ downloadToken, fileId, fileName, p7sFileId }) => (
        <AttachmentElement
          key={fileId}
          fileId={fileId}
          fileName={fileName}
          p7sFileId={p7sFileId}
          downloadToken={downloadToken}
        />
      ))}
    </>
  );
};

AttachmentsList.propTypes = {
  attachments: PropTypes.array
};

AttachmentsList.defaultProps = {
  attachments: []
};

export default AttachmentsList;
