import diff from 'deep-diff';
import { makeStyles } from '@mui/styles';
import { CircularProgress, IconButton } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import React, { useCallback, useEffect, useState } from 'react';
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

interface EditorDialogProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  language?: string;
  value?: string;
  handleSave?: (value: string) => Promise<unknown>;
  onChange?: (value: string) => void;
}

export const EditorDialog = ({
  open,
  title,
  onClose,
  language = 'json',
  value: defaultValue,
  handleSave,
  onChange = () => {}
}: EditorDialogProps) => {
  const t = useTranslate('JsonSchemaEditor');
  const classes = useStyles() as unknown as Record<string, string>;
  const [value, setValue] = useState(defaultValue || '');

  const [errors, setErrors] = useState<unknown[]>([]);
  const [diffs, setDiffs] = useState<unknown[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(defaultValue || '');
  }, [defaultValue]);

  const handleChange = useCallback(
    (newValue: string) => {
      (onChange || setValue)(newValue);
      if (handleSave) {
        setDiffs(diff(defaultValue, newValue) || []);
      }
    },
    [defaultValue, onChange, handleSave]
  );

  const handleValidate = useCallback((newErrors: unknown[]) => {
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
                <SaveIcon {...({ size: 24 } as unknown as Record<string, unknown>)} />
              )}
            </IconButton>
          ) : null}
          <UserSettingsButton
            part="editor"
            title={t('EditorSettings')}
            icon={<SettingsIcon />}
            schema={editorSettingsSchema}
            defaults={{
              controlHintsEnabled: true
            }}
          />
        </div>
      }
    >
      <Editor
        {...({
          height: '100%',
          width: '100%',
          value,
          language,
          onChange: handleChange,
          onValidate: handleValidate,
          handleSave: onSave
        } as unknown as Record<string, unknown>)}
      />
    </FullScreenDialog>
  );
};
