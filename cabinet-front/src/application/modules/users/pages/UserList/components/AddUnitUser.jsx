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

import ConfirmDialog from 'components/ConfirmDialog';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import schema from '../variables/unitUserSchema';

const styles = (theme) => ({
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

const AddUnitUser = ({ t, actions, classes }) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState({});
  const [errors, setErrors] = React.useState([]);
  const [error, setError] = React.useState(null);

  const handleSave = React.useCallback(async () => {
    const validationErrors = validateData(value, schema);
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
          <SchemaForm
            schema={schema}
            errors={errors}
            value={value}
            onChange={handleChangeAdapter(value, setValue)}
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

const styled = withStyles(styles)(AddUnitUser);
export default translate('UserListPage')(styled);
