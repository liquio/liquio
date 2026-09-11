import React from 'react';
import { translate } from 'react-translate';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ExistedElementDialogProps {
  t: (key: string) => string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ExistedElementDialog = ({ t, open, onClose, onSave }: ExistedElementDialogProps) => (
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

export default translate('JsonSchemaEditor')(ExistedElementDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
