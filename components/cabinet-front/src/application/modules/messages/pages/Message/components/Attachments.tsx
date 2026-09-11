import React from 'react';
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

interface AttachmentElementProps {
  fileId: string;
  fileName: string;
  p7sFileId: string;
  downloadToken: string;
}

const AttachmentElement = ({ fileId, fileName, p7sFileId, downloadToken }: AttachmentElementProps) => {
  const t = useTranslate('Elements');
  const dispatch = useDispatch();
  const classes = useStyles();
  const [downloading, setDownloading] = React.useState(false);

  // `handleDownload` is invoked below with an argument it never declares (a
  // pre-existing quirk — the passed value is simply ignored); preserved as-is.
  const handleDownload = async (_unused?: unknown) => {
    if (downloading) return;

    setDownloading(true);

    const document = await downloadFile(
      {
        downloadToken
      },
      false,
      // Passed as a truthy/falsy flag, not used as an id — the real param is
      // `boolean`; this file's presence-or-absence toggles p7s mode, matching
      // the original untyped call exactly.
      p7sFileId as unknown as boolean
    )(dispatch as never);

    setDownloading(false);

    if (document instanceof Error || !document) {
      addMessage(new Message('FailUploadingAttachment', 'error'));
      return;
    }

    downloadBase64Attach({ fileName }, base64ToBlob(document as string));
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
          {downloading ? <CircularProgress size={24} /> : <SaveAltIcon {...({ size: 24 } as unknown as Record<string, unknown>)} />}
        </IconButton>
      </Tooltip>
    </Typography>
  );
};

interface AttachmentItem {
  downloadToken: string;
  fileId: string;
  fileName: string;
  p7sFileId: string;
}

interface AttachmentsListProps {
  attachments?: AttachmentItem[];
}

const AttachmentsList = ({ attachments = [] }: AttachmentsListProps) => {
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

export default AttachmentsList;
