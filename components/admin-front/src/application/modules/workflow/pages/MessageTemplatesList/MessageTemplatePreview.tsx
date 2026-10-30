import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslate } from 'react-translate';

interface MessageTemplatePreviewProps {
  open: boolean;
  html: string;
  title: string;
  onClose: () => void;
}

const MessageTemplatePreview = ({ open, html, title, onClose }: MessageTemplatePreviewProps) => {
  const t = useTranslate('MessageTemplatesList');
  const tElements = useTranslate('Elements');
  const id = React.useId();
  const previewTitle = `${tElements('Preview')}: ${title}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby={id}
    >
      <DialogTitle id={id}>{previewTitle}</DialogTitle>
      <DialogContent>
        <iframe
          title={previewTitle}
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={html}
          style={{ display: 'block', width: '100%', height: '65vh', border: 0, background: '#fff' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageTemplatePreview;
