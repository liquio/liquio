import React from 'react';
import { translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

const ExistedElementDialog = ({ t, open, onClose, onSave }) => (
  <Dialog open={open} onClose={onClose} scroll="body">
    <DialogTitle>{t('ExistedElementId')}</DialogTitle>
    <DialogContent>
      <Typography>{t('ExistedElementWarning')}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{t('Cancel')}</Button>
      <Button color="secondary" variant="contained" onClick={onSave}>
        {t('Change')}
      </Button>
    </DialogActions>
  </Dialog>
);

export default translate('JsonSchemaEditor')(ExistedElementDialog);
