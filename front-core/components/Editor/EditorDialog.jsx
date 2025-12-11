import diff from 'deep-diff';
import { makeStyles } from '@mui/styles';
import { CircularProgress, IconButton } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import { useCallback, useEffect, useState } from 'react';
import { useTranslate } from 'react-translate';

import FullScreenDialog from 'components/FullScreenDialog';
import Editor from 'components/Editor';
import { UserSettingsButton } from 'components/UserSettings';
import editorSettingsSchema from 'components/Editor/variables/editorSettingsSchema.json';

const useStyles = makeStyles(() => ({
  disabled: {
    opacity: 0.5
  }
}));

export const EditorDialog = ({
  open,
  title,
  onClose,
  language = 'json',
  value: defaultValue,
  handleSave,
  onChange = () => {}
}) => {
  const t = useTranslate('JsonSchemaEditor');
  const classes = useStyles();
  const [value, setValue] = useState(defaultValue || '');

  const [errors, setErrors] = useState([]);
  const [diffs, setDiffs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(defaultValue || '');
  }, [defaultValue]);

  const handleChange = useCallback(
    (newValue) => {
      (onChange || setValue)(newValue);
      setDiffs(diff(defaultValue, newValue) || []);
    },
    [defaultValue, onChange]
  );

  const handleValidate = useCallback((newErrors) => {
    setErrors(newErrors);
  }, []);

  const onSave =
    handleSave &&
    useCallback(async () => {
      if (saving || errors.length || !diffs.length || !handleSave) return;

      setSaving(true);
      try {
        await handleSave(value);
        setDiffs([]);
        setErrors([]);
      } catch (error) {
        console.error('Error saving value:', error);
      } finally {
        setSaving(false);
      }
    }, [saving, errors, diffs, handleSave, value]);

  return (
    <FullScreenDialog
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <div className={classes.root}>
          {onSave ? (
            <IconButton
              disabled={saving || !!(errors || []).length || !(diffs || []).length}
              onClick={onSave}
              className={classes.saveButton}
              classes={{ disabled: classes.disabled }}
              size="large"
            >
              {saving ? (
                <CircularProgress size={24} className={classes.progress} />
              ) : (
                <SaveIcon size={24} />
              )}
            </IconButton>
          ) : null}
          <UserSettingsButton
            part="editor"
            title={t('EditorSettings')}
            icon={<SettingsIcon />}
            schema={editorSettingsSchema}
            defaults={{
              controlHintsEnabled: true,
              copilot: {
                enabled: true,
                model: 'liquio-copilot'
              }
            }}
          />
        </div>
      }
    >
      <Editor
        height="100%"
        width="100%"
        value={value}
        language={language}
        onChange={handleChange}
        onValidate={handleValidate}
        handleSave={onSave}
      />
    </FullScreenDialog>
  );
};
