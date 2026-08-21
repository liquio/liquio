import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PublicLinkDialog = ({ t, publicLink, copied, onClose, onCopy }) => (
  <Dialog open={Boolean(publicLink)} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{t('PublicLink')}</DialogTitle>
    <DialogContent>
      <TextField
        fullWidth
        margin="dense"
        label={copied ? t('CopiedToClipboard') : t('Link')}
        value={publicLink}
        inputProps={{ readOnly: true }}
        onFocus={(event) => event.target.select()}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{t('Close')}</Button>
      <Button
        startIcon={<OpenInNewIcon />}
        onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}
      >
        {t('Open')}
      </Button>
      <Button startIcon={<LinkIcon />} variant="contained" onClick={() => onCopy(publicLink)}>
        {t('Copy')}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PublicLinkDialog;
