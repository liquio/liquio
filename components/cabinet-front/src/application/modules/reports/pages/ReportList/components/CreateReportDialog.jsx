import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import ConfirmDialog from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import reportSchema from 'modules/reports/pages/ReportList/variables/reportSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportList/components/ReportDraftSelect';
import * as api from 'services/api';

const CreateReportDialog = ({ open = false, onClose, handleSave }) => {
  const t = useTranslate('ReportListPage');
  const dispatch = useDispatch();

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState();
  const [error, setError] = React.useState();
  const [errors, setErrors] = React.useState();

  const schema = reportSchema({ t });

  const loadTemplate = React.useCallback(
    async (templateId) =>
      api.get(`custom/bpmn-bi/reports/${templateId}`, 'LOAD_REPORT_TEMPLATE', dispatch),
    [dispatch]
  );

  const handleCommit = async () => {
    const validationErrors = validateData(value, schema);
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      const template = await loadTemplate(value.template.id);
      await handleSave({
        data: {
          ...template.data,
          id: value.template.id,
          name: value.name
        }
      });
      onClose();
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  };

  React.useEffect(() => {
    setValue();
  }, [open]);

  return (
    <>
      <Dialog open={open} scroll="body" maxWidth="sm" fullWidth={true} onClose={!busy && onClose}>
        <DialogTitle>{t('CreateNewReport')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema}
            customControls={{ ReportDraftSelect }}
            onChange={handleChangeAdapter(value, setValue, true, schema)}
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

export default CreateReportDialog;
