import React from 'react';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import {
  SchemaForm as SchemaFormRaw,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';

import reportSchema from 'modules/reports/pages/ReportTemplates/variables/reportSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportTemplates/components/ReportDraftSelect';
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SchemaForm = SchemaFormRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface CreateReportDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  open?: boolean;
  onClose: () => void;
  handleSave: (value: unknown) => Promise<void>;
}

const CreateReportDialog = ({ t, open = false, onClose, handleSave }: CreateReportDialogProps) => {
  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState<unknown>();
  const [error, setError] = React.useState<{ message?: string } | undefined>();
  const [errors, setErrors] = React.useState<unknown[] | undefined>();

  const schema = reportSchema({ t });

  const handleCommit = async () => {
    const validationErrors = validateData(value as never, schema as never) as unknown as unknown[];
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      await handleSave(value);
      onClose();
    } catch (e) {
      setError(e as { message?: string });
    }
    setBusy(false);
  };

  React.useEffect(() => {
    setValue(undefined);
  }, [open]);

  return (
    <>
      <Dialog
        open={open}
        scroll="body"
        maxWidth="sm"
        fullWidth={true}
        onClose={!busy ? onClose : undefined}
      >
        <DialogTitle>{t('CreateNewReport')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema}
            customControls={{ ReportDraftSelect, UnitList }}
            onChange={handleChangeAdapter(value as never, setValue as never, true)}
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
        handleClose={() => setError(undefined)}
      />
    </>
  );
};

export default translate('ReportListPage')(CreateReportDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
