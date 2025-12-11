import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useTranslate } from 'react-translate';

import Editor from 'components/Editor';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import { useEffect, useState } from 'react';

const useStyles = makeStyles(() => ({
  contentRoot: {
    padding: 0,
  },
  actionsRoot: {
    marginBottom: 0,
  },
  schemaFormWrapper: {
    padding: '0 32px',
  },
}));

export const UserSettingsDialogView = ({
  open,
  icon,
  title,
  value: rawValue,
  schema,
  setValue,
  errors,
  setErrors,
  onClickSave,
  onClose,
  settings = {},
}) => {
  const classes = useStyles();
  const t = useTranslate('WorkflowAdminPage');
  const [jsonMode, setJsonMode] = useState(true);
  const [parsedValue, setParsedValue] = useState({});

  useEffect(() => {
    try {
      const parsed = JSON.parse(rawValue || '{}');
      setParsedValue(parsed);
    } catch (e) {
      console.error('Invalid JSON', e);
      setParsedValue({});
    }
  }, [rawValue]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={true}
      maxWidth="md"
    >
      <DialogTitle>
        {icon && <span style={{ marginRight: 16 }}>{icon}</span>}
        {title || t('EditorSettings')}
      </DialogTitle>
      <DialogContent
        height="400px"
        classes={{ root: classes.contentRoot }}
      >
        {(schema && !jsonMode) ? <div className={classes.schemaFormWrapper}>
          <SchemaForm
            value={parsedValue}
            errors={errors}
            schema={schema}
            onChange={handleChangeAdapter(parsedValue, (newValue) => {
              setValue(JSON.stringify(newValue, null, 2));
              const validateErrors = validateData(newValue, schema);
              setErrors(validateErrors);
            }, true)}
            handleSave={(newValue) => setValue(JSON.stringify(newValue, null, 2))}
          />
        </div> : <Editor
          height="400px"
          theme={settings?.options?.theme || 'vs-dark'}
          defaultLanguage="json"
          defaultValue={rawValue}
          onChange={setValue}
          onValidate={setErrors}
          options={{
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            ...(settings?.options || {}),
          }}
        />}
      </DialogContent>
      <DialogActions classes={{ root: classes.actionsRoot }}>
        {schema ? (
          <Button
            onClick={() => setJsonMode(!jsonMode)}
            color="primary"
          >
            {jsonMode ? t('EditForm') : t('EditJSON')}
          </Button>
        ) : null}
        <div style={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="primary">
          {t('Close')}
        </Button>
        <Button
          onClick={onClickSave}
          color="primary"
          variant="contained"
          disabled={errors.length > 0}
        >
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}