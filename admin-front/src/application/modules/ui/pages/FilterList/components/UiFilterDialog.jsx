import React from 'react';
import diff from 'deep-diff';
import { translate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ConfirmDialog from 'components/ConfirmDialog';

const filterOptions = [
  'tasks.my.opened',
  'tasks.my.closed',
  'tasks.unit.opened',
  'tasks.unit.closed',
  'workflows.not-draft',
  'workflows.draft',
  'workflows.trash',
  'workflows.not-draft.ordered-by-myself',
  'workflows.not-draft.ordered-by-unit',
  'workflows.not-draft.observed-by-unit'
];

const UiFilterDialog = ({ t, open, value, onCommit, onDelete, onClose }) => {
  const [data, setData] = React.useState(value || { isActive: true });
  const [errors, setErrors] = React.useState([]);
  const [openDeletePrompt, setOpenDeletePrompt] = React.useState(false);

  const [error, setError] = React.useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setData(value || { isActive: true });
    setErrors([]);
  }, [value, open]);

  const diffs = diff(data, value || { isActive: true });

  const schema = {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: t('Filter'),
        darkTheme: true,
        variant: 'outlined',
        readOnly: !!data.id,
        options: filterOptions
      },
      name: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: t('Name')
      }
    },
    required: ['filter', 'name']
  };

  const handleStore = async () => {
    const validateErrors = validateData(data, schema);
    setErrors(validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    try {
      await onCommit(data);
      onClose();
    } catch (e) {
      const errorList = (e.response ? e.response.errors : []).map(({ msg, path }) => ({
        message: t(msg),
        path
      }));

      if (errorList.length) {
        setErrors(errorList);
      } else {
        setError(e);
        setErrorDialogOpen(true);
      }
    }
  };

  const handleDelete = React.useCallback(async () => {
    try {
      await onDelete(data);
      setOpenDeletePrompt(false);
      onClose();
    } catch (e) {
      setError(e);
      setErrorDialogOpen(true);
    }
  }, [data, onClose, onDelete]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogTitle>{t('FilterSettings')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={data}
            errors={errors}
            schema={schema}
            onChange={handleChangeAdapter(data, setData, true)}
          />
        </DialogContent>
        <DialogActions>
          {onDelete ? (
            <Button color="secondary" onClick={() => setOpenDeletePrompt(true)}>
              {t('Delete')}
            </Button>
          ) : null}
          <div style={{ flexGrow: 1 }} />
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button color="primary" variant="contained" disabled={!diffs} onClick={handleStore}>
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={openDeletePrompt}
        title={t('DeletePrompt')}
        darkTheme={true}
        description={t('DeletePropmtDescription')}
        handleClose={() => setOpenDeletePrompt(false)}
        handleConfirm={handleDelete}
      />
      <ConfirmDialog
        open={errorDialogOpen}
        darkTheme={true}
        title={t('Error')}
        description={error && t(error.message)}
        handleClose={() => setErrorDialogOpen(false)}
      />
    </>
  );
};

export default translate('UIFilterList')(UiFilterDialog);
