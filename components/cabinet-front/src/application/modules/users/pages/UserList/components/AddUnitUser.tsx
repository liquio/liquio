import React from 'react';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import { Theme } from '@mui/material/styles';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import schema from '../variables/unitUserSchema.json';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  dialogActions: {
    justifyContent: 'space-between',
    padding: '16px 20px',
    '& button': {
      height: 40
    }
  },
  icon: {
    color: theme.palette.primary.main,
    fill: theme.palette.primary.main
  },
  button: {
    borderColor: theme.palette.primary.main
  }
});

interface AddUnitUserProps {
  t: (key: string) => string;
  actions: {
    handleAddUnitUser: (value: Record<string, unknown>) => Promise<unknown>;
    load: () => void;
  };
  classes: Record<string, string>;
}

const AddUnitUser = ({ t, actions, classes }: AddUnitUserProps) => {
  // Deferred, not module scope: `components/JsonSchema` has a known
  // circular-import history elsewhere in this codebase (see TYPESCRIPT.md's
  // CodeEditDialog batch notes) — a top-level cast risks a TDZ crash if
  // this file ever lands on a cycle through it.
  const SchemaFormLoose = SchemaForm as unknown as React.ComponentType<Record<string, unknown>>;
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<unknown[]>([]);
  const [error, setError] = React.useState<Error | null>(null);

  const handleSave = React.useCallback(async () => {
    const validationErrors = validateData(value, schema as never);
    setErrors(validationErrors);

    if (validationErrors && validationErrors.length) {
      return;
    }

    const result = await actions.handleAddUnitUser(value);

    if (result instanceof Error) {
      setError(result);
      return;
    }

    actions.load();
    setOpen(false);
    setValue({});
  }, [actions, value]);

  const handleOpen = React.useCallback(() => setOpen(true), []);
  const handleClose = React.useCallback(() => setOpen(false), []);
  const handleCancel = React.useCallback(() => {
    setOpen(false);
    setValue({});
  }, []);
  const handleClearError = React.useCallback(() => setValue({}), []);

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        startIcon={<AddIcon className={classes.icon} />}
        aria-label={t('AddUnitUser')}
        className={classes.button}
      >
        {t('AddUnitUser')}
      </Button>
      <Dialog open={open} scroll="body" maxWidth="sm" fullWidth={true} onClose={handleClose}>
        <DialogTitle>
          <Typography variant="h4">{t('AddUnitUser')}</Typography>
        </DialogTitle>
        <DialogContent>
          <SchemaFormLoose
            schema={schema}
            errors={errors}
            value={value}
            onChange={handleChangeAdapter(value, setValue as never)}
          />
        </DialogContent>
        <DialogActions
          classes={{
            root: classes.dialogActions
          }}
        >
          <Button onClick={handleCancel} aria-label={t('Cancel')}>
            {t('Cancel')}
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleSave}
            aria-label={t('AddUnitUser')}
          >
            {t('AddUnitUser')}
          </Button>
        </DialogActions>
      </Dialog>
      {error ? (
        <ConfirmDialog
          open={!!error}
          title={t('ErrorAddingUser')}
          description={t(error.message)}
          handleClose={handleClearError}
        />
      ) : null}
    </>
  );
};

const styled = withStyles(styles)(AddUnitUser as never);
export default translate('UserListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
