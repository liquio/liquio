import React from 'react';
import diff from 'deep-diff';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import ConfirmDialog from 'components/ConfirmDialog';

const InterfaceDialog = ({ t, open, value, onCommit, onClose, readOnly }) => {
  const [data, setData] = React.useState(value || { isActive: true });
  const [errors, setErrors] = React.useState([]);

  const [error, setError] = React.useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: t('Name'),
      },
      route: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: t('Route'),
      },
      interfaceSchema: {
        control: 'code.editor',
        description: t('InterfaceScheme'),
        mode: 'json',
        validate: true,
        defaultSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    required: ['name', 'route', 'interfaceSchema'],
  };

  const handleStore = async (dataCallback) => {
    const dataToSave = dataCallback || data;

    const diffs = diff(dataToSave, value || { isActive: true });

    if (!diffs) {
      onClose();
      return;
    }

    const validateErrors = validateData(dataToSave, schema);

    setErrors(validateErrors);

    console.log('ValidationErrors', validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    try {
      await onCommit(dataToSave);
      if (!dataCallback) onClose();
    } catch (e) {
      const errorList = (e.response ? e.response.errors : []).map(
        ({ msg, param }) => ({
          message: t(msg),
          path: param,
        }),
      );

      if (errorList.length) {
        setErrors(errorList);
      } else {
        setError(e);
        setErrorDialogOpen(true);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogTitle>{t('InterfaceSettings')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={data}
            errors={errors}
            schema={schema}
            readOnly={readOnly}
            onChange={handleChangeAdapter(data, setData, true)}
            handleSave={(newData) => {
              handleStore({
                ...data,
                interfaceSchema: newData,
              });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          {readOnly ? null : (
            <Button
              color="primary"
              variant="contained"
              onClick={() => handleStore()}
            >
              {t('Save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={errorDialogOpen}
        title={t('Error')}
        description={error && t(error.message)}
        handleClose={() => setErrorDialogOpen(false)}
        darkTheme={true}
      />
    </>
  );
};

export default translate('InterfacesList')(InterfaceDialog);
