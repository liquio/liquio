import React from 'react';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';

interface AddNewPresetDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  open: boolean;
  onClose: () => void;
  handleAddPreset: (name: string) => void;
}

const AddNewPresetDialog = ({ t, open, onClose, handleAddPreset }: AddNewPresetDialogProps) => {
  const [name, setName] = React.useState('');

  const handleAdd = () => {
    handleAddPreset(name);
    setName('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth={true}>
      <DialogTitle>{t('AddFilterPreset')}</DialogTitle>
      <DialogContent>
        <TextField
          variant="standard"
          value={name}
          autoFocus={true}
          label={t('FilterPresetName')}
          onKeyPress={({ key }) => key === 'Enter' && handleAdd()}
          onChange={({ target: { value } }) => setName(value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button color="primary" variant="contained" disabled={!name} onClick={handleAdd}>
          {t('AddPreset')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default translate('DataTable')(AddNewPresetDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
