import React from 'react';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

import ConfirmDialog from 'components/ConfirmDialog';
import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';

import reportSchema from 'modules/reports/pages/ReportTemplates/variables/reportSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportTemplates/components/ReportDraftSelect';
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';

const CreateReportDialog = ({ t, open = false, onClose, handleSave }) => {
  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState();
  const [error, setError] = React.useState();
  const [errors, setErrors] = React.useState();

  const schema = reportSchema({ t });

  const handleCommit = async () => {
    const validationErrors = validateData(value, schema);
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      await handleSave(value);
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
      <Dialog
        open={open}
        scroll="body"
        maxWidth="sm"
        fullWidth={true}
        onClose={!busy && onClose}
      >
        <DialogTitle>{t('CreateNewReport')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema}
            customControls={{ ReportDraftSelect, UnitList }}
            onChange={handleChangeAdapter(value, setValue, true)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {t('Close')}
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleCommit}
            disabled={busy}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!error}
        darkTheme={true}
        title={t('ErrorSavingReport')}
        description={error && error.message}
        handleClose={() => setError()}
      />
    </>
  );
};

export default translate('ReportListPage')(CreateReportDialog);
