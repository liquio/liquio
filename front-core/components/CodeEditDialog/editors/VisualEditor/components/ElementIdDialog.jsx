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

const ElementIdDialog = ({ open, onClose, onSave, variant = 'standard', readOnly = false }) => {
  const t = useTranslate('JsonSchemaEditor');
  const [value, setValue] = React.useState('');

  return (
    <Dialog open={open} onClose={onClose} scroll="body">
      <DialogTitle>{t('NewElementId')}</DialogTitle>
      <DialogContent>
        <TextField
          variant={variant}
          readOnly={readOnly}
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
