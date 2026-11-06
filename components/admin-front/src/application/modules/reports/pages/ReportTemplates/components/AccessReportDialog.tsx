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

import UnitList from 'application/modules/users/pages/Unit/components/UnitList';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SchemaForm = SchemaFormRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportValue {
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

interface AccessReportDialogProps {
  open?: boolean;
  onClose: () => void;
  handleSave: (value: ReportValue, arg2: boolean) => Promise<void>;
  report?: ReportValue;
}

const AccessReportDialog = ({ open = false, onClose, handleSave, report }: AccessReportDialogProps) => {
  const t = useTranslate('ReportListPage');

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState(report?.meta);
  const [error, setError] = React.useState<{ message?: string } | undefined>();
  const [errors, setErrors] = React.useState<unknown[] | undefined>();

  // See RenameReportDialog for why this `useCallback` (rather than `useMemo`)
  // usage is a pre-existing, harmless-in-practice bug preserved as-is.
  const schema = (React.useCallback(
    ({
      type: 'object',
      properties: {
        access: {
          type: 'array',
          minItems: 1,
          control: 'unit.list',
          description: t('UnitMember'),
        },
      },
      required: ['access'],
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
      await handleSave({ ...report, meta: value }, false);
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
            customControls={{ UnitList }}
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

export default AccessReportDialog;
