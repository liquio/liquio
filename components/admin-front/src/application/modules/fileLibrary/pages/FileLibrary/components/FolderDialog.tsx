import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';

interface FolderDialogProps {
  t: (key: string) => string;
  open: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

const FolderDialog = ({ t, open, name, onNameChange, onClose, onCreate }: FolderDialogProps) => {
  const disabled = !name.trim();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' || disabled) {
      return;
    }

    event.preventDefault();
    onCreate();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('Folder')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('Name')}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button disabled={disabled} variant="contained" color="primary" onClick={onCreate}>
          {t('Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FolderDialog;
