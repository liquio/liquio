import React from 'react';
import { useTranslate } from 'react-translate';
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

import ReportDraftSelect from 'modules/reports/pages/ReportTemplates/components/ReportDraftSelect';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SchemaForm = SchemaFormRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportValue {
  name?: string;
  [key: string]: unknown;
}

interface RenameReportDialogProps {
  open?: boolean;
  onClose: () => void;
  handleSave: (value: ReportValue, arg2: boolean) => Promise<void>;
  report: ReportValue;
}

const RenameReportDialog = ({ open = false, onClose, handleSave, report }: RenameReportDialogProps) => {
  const t = useTranslate('ReportListPage');

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState(report);
  const [error, setError] = React.useState<{ message?: string } | undefined>();
  const [errors, setErrors] = React.useState<unknown[] | undefined>();

  // `React.useCallback`'s first argument must be a function, but this is an
  // object literal — a pre-existing bug (should be `useMemo`), harmless only
  // because `useCallback` never actually calls its first argument, just
  // memoizes and returns it as-is. Preserved via casts rather than switched
  // to `useMemo`.
  const schema = (React.useCallback(
    ({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: t('ReportName'),
        },
      },
      required: ['name'],
    } as unknown) as () => void,
    [t],
  ) as unknown) as Record<string, unknown>;

  const handleCommit = async () => {
    const validationErrors = validateData(value, schema as never) as unknown as unknown[];
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    setBusy(true);
    try {
      await handleSave(value, false);
      onClose();
    } catch (e) {
      setError(e as { message?: string });
    }
    setBusy(false);
  };

  return (
    <>
      <Dialog
        open={open}
        scroll="body"
        maxWidth="sm"
        fullWidth={true}
        onClose={!busy ? onClose : undefined}
      >
        <DialogTitle>{t('EditReportDialog')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema}
            customControls={{ ReportDraftSelect }}
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

export default RenameReportDialog;
