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
import { useTranslate } from 'react-translate';

import {
  SchemaForm,
  validateData,
  handleChangeAdapter,
} from 'components/JsonSchema';

const initialState = {
  type: 'minor',
};

const useStyles = makeStyles((theme) => ({
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
    background: theme.navigator.sidebarBg,
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

const NewVersionDialog = ({ open, onClose, onSubmit }) => {
  const t = useTranslate('WorkflowAdminPage');
  const classes = useStyles();

  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState(initialState);
  const [errors, setErrors] = React.useState();
  const [error, setError] = React.useState();

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
      setErrors();
      const validateErrors = validateData(value, schema);

      setErrors(validateErrors);
      if (validateErrors && validateErrors.length) {
        throw new Error('ResolveAllErrors');
      }

      setBusy(true);
      await onSubmit(value);
      setBusy(false);
      onClose();
      setValue(initialState);
    } catch (e) {
      setError(new Error(t(e.message)));
    }
  }, [onClose, onSubmit, schema, t, value]);

  return (
    <Dialog
      open={open}
      onClose={!busy && onClose}
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
          value={value}
          errors={errors}
          schema={schema}
          onChange={handleChangeAdapter(value, setValue, true)}
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
