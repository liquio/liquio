import React from 'react';
import classNames from 'classnames';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { useTranslate } from 'react-translate';

import {
  SchemaForm,
  validateData,
  handleChangeAdapter,
} from 'components/JsonSchema';

interface NewVersionValue {
  type: string;
  name?: string;
  description?: string;
}

const initialState: NewVersionValue = {
  type: 'minor',
};

type AppTheme = Theme & {
  navigator?: { sidebarBg?: string };
  buttonHoverBg?: string;
};

const useStyles = makeStyles((theme: AppTheme) => ({
  error: {
    color: '#f44336',
    marginLeft: 10,
  },
  dialogTitle: {
    paddingBottom: 0,
    paddingTop: 30,
    marginBottom: 30,
    '& h2': {
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
    },
  },
  dialogPaper: {
    background: theme.navigator?.sidebarBg,
  },
  dialogActionsRoot: {
    padding: '0 24px',
    paddingBottom: 25,
  },
  hover: {
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
}));

interface NewVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: NewVersionValue) => Promise<void>;
}

const NewVersionDialog = ({ open, onClose, onSubmit }: NewVersionDialogProps) => {
  const t = useTranslate('WorkflowAdminPage');
  const classes = useStyles();

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState<NewVersionValue>(initialState);
  const [errors, setErrors] = React.useState<unknown[] | undefined>();
  const [error, setError] = React.useState<Error | undefined>();

  const schema = React.useMemo(
    () => ({
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: t('VersionType'),
          darkTheme: true,
          variant: 'outlined',
          notRequiredLabel: '',
          options: [
            {
              id: 'minor',
              name: t('MinorVersionType'),
            },
            {
              id: 'major',
              name: t('MajorVersionType'),
            },
          ],
        },
        name: {
          type: 'string',
          description: t('VersionName'),
          darkTheme: true,
          variant: 'outlined',
          notRequiredLabel: '',
          checkRequired: "(v, s, r, p) => p?.type === 'major'",
        },
        description: {
          type: 'string',
          description: t('VersionDescription'),
          darkTheme: true,
          variant: 'outlined',
          notRequiredLabel: '',
          checkRequired: "(v, s, r, p) => p?.type === 'major'",
        },
      },
      required: ['type'],
    }),
    [t],
  );

  const handleSubmit = React.useCallback(async () => {
    try {
      setErrors(undefined);
      const validateErrors = validateData(value as never, schema as never);

      setErrors(validateErrors as unknown[] | undefined);
      if (validateErrors && validateErrors.length) {
        throw new Error('ResolveAllErrors');
      }

      setBusy(true);
      await onSubmit(value);
      setBusy(false);
      onClose();
      setValue(initialState);
    } catch (e) {
      setError(new Error(t((e as Error).message)));
    }
  }, [onClose, onSubmit, schema, t, value]);

  return (
    <Dialog
      open={open}
      onClose={(!busy && onClose) as (() => void) | undefined}
      maxWidth="sm"
      fullWidth={true}
      scroll="body"
      classes={{
        paper: classNames(classes.dialogPaper),
      }}
    >
      <DialogTitle
        classes={{
          root: classNames(classes.dialogTitle),
        }}
      >
        {t('CreateNewVersion')}
      </DialogTitle>
      <DialogContent>
        <SchemaForm
          {...({
            value,
            errors,
            schema,
            onChange: handleChangeAdapter(value as never, setValue as never, true),
          } as unknown as Record<string, unknown>)}
        />
      </DialogContent>
      <DialogActions
        classes={{
          root: classNames(classes.dialogActionsRoot),
        }}
      >
        {error ? (
          <Typography className={classes.error}>{error?.message}</Typography>
        ) : null}
        <div style={{ flexGrow: 1 }} />
        <Button
          disabled={busy}
          onClick={onClose}
          color="primary"
          className={classes.hover}
        >
          {t('Cancel')}
        </Button>
        <Button
          color="primary"
          variant="contained"
          disabled={busy}
          onClick={handleSubmit}
        >
          {t('Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewVersionDialog;
