import React from 'react';

import { TextField, Button } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';

import formElement from 'components/JsonSchema/components/formElement';
import toOption from 'components/JsonSchema/elements/Register/SingleKeyRegister/toOption';

const SingleKeyRegisterPreview = ({ t, value, setEdit, description }) => {
  const inputValue = []
    .concat(value)
    .filter(Boolean)
    .map(toOption)
    .map(({ label }) => label)
    .join(', ');

  return (
    <TextField
      variant="standard"
      disabled={true}
      label={description}
      value={inputValue || t('Unselected')}
      InputProps={{
        endAdornment: (
          <Button startIcon={<CreateIcon />} onClick={() => setEdit(true)}>
            {t('ChangeValue')}
          </Button>
        ),
      }}
    />
  );
};

export default formElement(SingleKeyRegisterPreview);
