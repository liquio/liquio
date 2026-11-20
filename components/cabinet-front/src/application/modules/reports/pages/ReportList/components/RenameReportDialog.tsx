import React from 'react';
import { useTranslate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ReportDraftSelect from 'modules/reports/pages/ReportList/components/ReportDraftSelect';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportValue {
  name?: string;
  [key: string]: unknown;
}

interface RenameReportDialogProps {
  open?: boolean;
  onClose: () => void;
  handleSave: (value: ReportValue, replace: boolean) => Promise<unknown>;
  report?: ReportValue;
}

const RenameReportDialog = ({ open = false, onClose, handleSave, report }: RenameReportDialogProps) => {
  const t = useTranslate('ReportListPage');

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState<ReportValue | undefined>(report);
  const [error, setError] = React.useState<Error | undefined>();
  const [errors, setErrors] = React.useState<unknown[] | undefined>();

  // `React.useCallback` here is passed a plain object literal, not a function
  // — a pre-existing bug (harmless, since useCallback never invokes its first
  // argument, so this just memoizes the schema object itself). Preserved
  // exactly via a cast rather than "fixed" to useMemo.
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
    } as unknown as () => void,
    [t]
  );

  const handleCommit = async () => {
    const validationErrors = validateData(value as Record<string, unknown>, schema as never);
    setErrors(validationErrors as unknown[] | undefined);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      await handleSave(value as ReportValue, false);
      onClose();
    } catch (e) {
      setError(e as Error);
    }
    setBusy(false);
  };

  return (
    <>
      <Dialog open={open} scroll="body" maxWidth="sm" fullWidth={true} onClose={(!busy && onClose) as never}>
        <DialogTitle>{t('EditReportDialog')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value as never}
            errors={errors as never}
            readOnly={busy}
            schema={schema as never}
            customControls={{ ReportDraftSelect }}
            onChange={handleChangeAdapter(value as never, setValue as never, true)}
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

export default RenameReportDialog;
