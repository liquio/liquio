import { useCallback, useEffect, useState } from 'react';
import { useTranslate } from 'react-translate';
import FullScreenDialog from 'components/FullScreenDialog';
import { JsonSchemaEditor } from 'components/JsonSchema/editor';
import { SaveOutlined } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { SelectEditorMode } from './SelectEditorMode';
import { EditorComponents, type EditorMode } from './JsonSchemaEditor';
import { RunProcessButton } from './RunProcessButton';

interface JsonSchemaEditorDialogProps {
  open: boolean;
  value?: string;
  title?: string;
  onClose: () => void;
  handleSave?: (value: string) => void | Promise<void>;
  onChange?: (value: string) => void | Promise<void>;
  meta?: {
    workflowTemplateId?: string | number;
    taskTemplateId?: string | number;
  };
}

export const JsonSchemaEditorDialog = ({
  open,
  value: defaultValue = '',
  title,
  onClose,
  handleSave: onSave = () => undefined,
  onChange = () => undefined,
  meta = {},
}: JsonSchemaEditorDialogProps) => {
  const t = useTranslate('JsonSchemaEditor');
  const [value, setValue] = useState(defaultValue);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>('code');

  useEffect(() => {
    setValue(defaultValue);
    setErrors([]);
  }, [defaultValue]);

  const handleSave = useCallback(async (newValue?: unknown) => {
    const nextValue = typeof newValue === 'string' ? newValue : value;
    if (errors.length) return;
    await onChange(nextValue);
    await onSave(nextValue);
  }, [errors.length, onChange, onSave, value]);

  const EditorSettings = EditorComponents[editorMode].Settings || (() => null);
  const hasErrors = errors.length > 0;

  return (
    <FullScreenDialog
      open={open}
      title={title}
      disableClose={hasErrors}
      disableEscapeKeyDown={true}
      disableScrollBody={true}
      onClose={() => { if (!hasErrors) onClose(); }}
      beforeTitle={<SelectEditorMode errors={errors} value={editorMode} onChange={setEditorMode} />}
      actions={(
        <>
          <EditorSettings />
          <RunProcessButton workflowTemplateId={meta.workflowTemplateId} taskTemplateId={meta.taskTemplateId} />
          <Tooltip title={t('Save')}>
            <IconButton
              size="large"
              disabled={hasErrors || value === defaultValue}
              onClick={handleSave}
              style={{ opacity: hasErrors || value === defaultValue ? 0.5 : 1 }}
            >
              <SaveOutlined />
            </IconButton>
          </Tooltip>
        </>
      )}
    >
      <JsonSchemaEditor mode={editorMode} value={value} errors={errors} onChange={setValue} onValidate={setErrors} handleSave={handleSave} />
    </FullScreenDialog>
  );
};
