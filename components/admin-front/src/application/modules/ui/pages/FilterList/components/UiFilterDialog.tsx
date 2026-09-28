import React from 'react';
import diff from 'deep-diff';
import { translate } from 'react-translate';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const FILTER_KEYS = [
  'tasks.my.opened',
  'tasks.my.closed',
  'tasks.unit.opened',
  'tasks.unit.closed',
  'workflows.not-draft',
  'workflows.draft',
  'workflows.trash',
  'workflows.not-draft.ordered-by-myself',
  'workflows.not-draft.ordered-by-unit',
  'workflows.not-draft.observed-by-unit',
];

interface UiFilter {
  id?: string;
  isActive?: boolean;
  filter?: string;
  name?: string;
}

interface UiFilterDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  open: boolean;
  value?: UiFilter;
  onCommit: (data: UiFilter) => Promise<void>;
  onDelete?: (data: UiFilter) => Promise<void>;
  onClose: () => void;
}

const UiFilterDialog = ({ t, open, value, onCommit, onDelete, onClose }: UiFilterDialogProps) => {
  const filterOptions = FILTER_KEYS.map((key) => ({ id: key, name: t(key) }));
  const [data, setData] = React.useState<UiFilter>(value || { isActive: true });
  const [errors, setErrors] = React.useState<unknown[]>([]);
  const [openDeletePrompt, setOpenDeletePrompt] = React.useState(false);

  const [error, setError] = React.useState<{ message?: string } | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setData(value || { isActive: true });
    setErrors([]);
  }, [value, open]);

  const diffs = diff(data as never, (value || { isActive: true }) as never);

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
  } as never;

  const handleStore = async () => {
    const validateErrors = validateData(data as never, schema) as unknown[];
    setErrors(validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    try {
      await onCommit(data);
      onClose();
    } catch (e) {
      const errorList = ((e as { response?: { errors: { msg: string; path: string }[] } }).response
        ? (e as { response: { errors: { msg: string; path: string }[] } }).response.errors
        : []
      ).map(({ msg, path }) => ({
        message: t(msg),
        path
      }));

      if (errorList.length) {
        setErrors(errorList);
      } else {
        setError(e as { message?: string });
        setErrorDialogOpen(true);
      }
    }
  };

  const handleDelete = React.useCallback(async () => {
    try {
      await onDelete?.(data);
      setOpenDeletePrompt(false);
      onClose();
    } catch (e) {
      setError(e as { message?: string });
      setErrorDialogOpen(true);
    }
  }, [data, onClose, onDelete]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogTitle>{t('FilterSettings')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={data as never}
            errors={errors as never}
            schema={schema}
            onChange={handleChangeAdapter(data as never, setData as never, true)}
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
        description={error && t(error.message as string)}
        handleClose={() => setErrorDialogOpen(false)}
      />
    </>
  );
};

export default translate('UIFilterList')(UiFilterDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
