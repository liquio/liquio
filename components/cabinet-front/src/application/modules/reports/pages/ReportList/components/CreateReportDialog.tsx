import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import reportSchema from 'modules/reports/pages/ReportList/variables/reportSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportList/components/ReportDraftSelect';
import * as api from 'services/api';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportValue {
  template?: { id?: string | number };
  name?: string;
}

interface CreateReportDialogProps {
  open?: boolean;
  onClose: () => void;
  handleSave: (data: { data: Record<string, unknown> }) => Promise<unknown>;
}

const CreateReportDialog = ({ open = false, onClose, handleSave }: CreateReportDialogProps) => {
  const t = useTranslate('ReportListPage');
  const dispatch = useDispatch();

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState<ReportValue | undefined>();
  const [error, setError] = React.useState<Error | undefined>();
  const [errors, setErrors] = React.useState<unknown[] | undefined>();

  const schema = reportSchema({ t });

  const loadTemplate = React.useCallback(
    async (templateId: string | number) =>
      api.get(`custom/bpmn-bi/reports/${templateId}`, 'LOAD_REPORT_TEMPLATE', dispatch as never),
    [dispatch]
  );

  const handleCommit = async () => {
    const validationErrors = validateData(value as Record<string, unknown>, schema as never);
    setErrors(validationErrors as unknown[] | undefined);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      const template = (await loadTemplate((value as ReportValue).template?.id as string | number)) as { data: Record<string, unknown> };
      await handleSave({
        data: {
          ...template.data,
          id: (value as ReportValue).template?.id,
          name: (value as ReportValue).name
        }
      });
      onClose();
    } catch (e) {
      setError(e as Error);
    }
    setBusy(false);
  };

  React.useEffect(() => {
    setValue(undefined);
  }, [open]);

  return (
    <>
      <Dialog open={open} scroll="body" maxWidth="sm" fullWidth={true} onClose={(!busy && onClose) as never}>
        <DialogTitle>{t('CreateNewReport')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value as never}
            errors={errors as never}
            readOnly={busy}
            schema={schema as never}
            customControls={{ ReportDraftSelect }}
            onChange={handleChangeAdapter(value as never, setValue as never, true, schema as never)}
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
        handleClose={() => setError(undefined)}
      />
    </>
  );
};

export default CreateReportDialog;
