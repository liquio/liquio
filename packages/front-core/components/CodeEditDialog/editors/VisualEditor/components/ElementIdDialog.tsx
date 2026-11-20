import React from 'react';
import { useTranslate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';

interface ElementIdDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  variant?: 'standard' | 'outlined' | 'filled';
  readOnly?: boolean;
}

const ElementIdDialog = ({ open, onClose, onSave, variant = 'standard', readOnly = false }: ElementIdDialogProps) => {
  const t = useTranslate('JsonSchemaEditor');
  const [value, setValue] = React.useState('');

  return (
    <Dialog open={open} onClose={onClose} scroll="body">
      <DialogTitle>{t('NewElementId')}</DialogTitle>
      <DialogContent>
        <TextField
          variant={variant}
          {...({ readOnly } as unknown as Record<string, unknown>)}
          autoFocus={true}
          onChange={({ target: { value: newValue } }) => setValue(newValue)}
          onKeyPress={(ev) => {
            if (ev.key === 'Enter' && value) {
              onSave(value);
              setValue('');
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button
          disabled={!value}
          color="primary"
          variant="contained"
          onClick={() => {
            onSave(value);
            setValue('');
          }}
        >
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ElementIdDialog;
