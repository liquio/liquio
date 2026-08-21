import { useCallback, useEffect, useState } from 'react';
import { useTranslate } from 'react-translate';

import FullScreenDialog from 'components/FullScreenDialog';

import { JsonSchemaEditor } from 'components/JsonSchema/editor';
import { SaveOutlined } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { SelectEditorMode } from './SelectEditorMode';
import { EditorComponents } from './JsonSchemaEditor';
import { RunProcessButton } from './RunProcessButton';

export const JsonSchemaEditorDialog = ({
  open,
  value: defaultValue,
  title,
  onClose,
  handleSave: onSave = () => null,
  onChange = () => null,
  meta = {},
}) => {
  const t = useTranslate('JsonSchemaEditor');

  const [value, setValue] = useState(defaultValue);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setValue(defaultValue);
    setErrors([]);
  }, [defaultValue]);

  const [editorMode, setEditorMode] = useState('code');

  const handleSave = useCallback(async (newValue) => {
    const val = typeof newValue === 'string' ? newValue : value;
    if (errors?.length) {
      return;
    }
    await onChange(val);
    await onSave(val);
    // onClose();
  }, [errors, onSave, value]);

  const EditorSettings = EditorComponents[editorMode]?.Settings || (() => null);

  return (
    <FullScreenDialog
      open={open}
      title={title}
      // titleTextAlign="center"
      disableClose={errors?.length}
      disableEscapeKeyDown={true}
      disableScrollBody={true}
      onClose={() => {
        if (!errors?.length) {
          onClose();
        }
      }}
      beforeTitle={(
        <SelectEditorMode errors={errors} value={editorMode} onChange={setEditorMode} />
      )}
      actions={(
        <>
          <EditorSettings />
          <RunProcessButton workflowTemplateId={meta?.workflowTemplateId} taskTemplateId={meta?.taskTemplateId} />
          <Tooltip title={t('Save')}>
            <IconButton
              size="large"
              disabled={errors?.length || value === defaultValue}
              onClick={handleSave}
              style={{ opacity: errors?.length || value === defaultValue ? 0.5 : 1 }}
            >
              <SaveOutlined />
            </IconButton>
          </Tooltip>
        </>
      )}
    >
      <JsonSchemaEditor
        mode={editorMode}
        value={value}
        errors={errors}
        onChange={setValue}
        onValidate={setErrors}
        handleSave={handleSave}
      />
    </FullScreenDialog>
  );
}