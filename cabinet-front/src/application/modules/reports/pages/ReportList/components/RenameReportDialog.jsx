import React from 'react';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import ConfirmDialog from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportList/components/ReportDraftSelect';

const RenameReportDialog = ({ open = false, onClose, handleSave, report }) => {
  const t = useTranslate('ReportListPage');

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState(report);
  const [error, setError] = React.useState();
  const [errors, setErrors] = React.useState();

  const schema = React.useCallback(
    {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: t('ReportName')
        }
      },
      required: ['name']
    },
    [t]
  );

  const handleCommit = async () => {
    const validationErrors = validateData(value, schema);
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      await handleSave(value, false);
      onClose();
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  };

  return (
    <>
      <Dialog open={open} scroll="body" maxWidth="sm" fullWidth={true} onClose={!busy && onClose}>
        <DialogTitle>{t('EditReportDialog')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema}
            customControls={{ ReportDraftSelect }}
            onChange={handleChangeAdapter(value, setValue, true)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {t('Close')}
          </Button>
          <Button color="primary" variant="contained" onClick={handleCommit} disabled={busy}>
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!error}
        title={t('ErrorSavingReport')}
        description={error && error.message}
        handleClose={() => setError()}
      />
    </>
  );
};

export default RenameReportDialog;
