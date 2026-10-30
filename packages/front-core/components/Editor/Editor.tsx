import { useEffect, useState } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';

import { useOptions } from './hooks/useOptions';
import { useLanguageProvider } from './hooks/useLanguageProvider';
import { useMonacoEditorThemes } from './hooks/useMonacoEditorThemes';
import { useDiagnosticsOptions } from './hooks/useDiagnosticsOptions';
import { DragProvider } from './DragProvider';

// `monaco-editor`'s package.json "exports" map isn't resolved under this
// project's moduleResolution setting when imported directly, so the editor
// instance type is derived from @monaco-editor/react's own OnMount export
// instead of importing from 'monaco-editor'.
type MonacoEditorInstance = Parameters<OnMount>[0];

interface EditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  onMount?: OnMount;
  handleSave?: (value: string) => void;
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

export const Editor = (props: EditorProps) => {
  const [value, setValue] = useState(props.value || '');

  useEffect(() => {
    if (props.value !== undefined && props.value !== value) {
      setValue(props.value);
    }
  }, [props.value]);

  const handleChange = (newValue: string | undefined) => {
    setValue(newValue || '');
    props.onChange && props.onChange(newValue);
  };
  const [editorInstance, setEditorInstance] = useState<MonacoEditorInstance | null>(null);

  const userOptions = useOptions(props.options);
  const options = {
    ...userOptions,
    tabSize: 4,
    detectIndentation: false,
    insertSpaces: true,
    automaticLayout: true
  };

  useMonacoEditorThemes();
  useDiagnosticsOptions();
  useLanguageProvider(props.value);

  const editorDidMount: OnMount = (editor, monaco) => {
    setEditorInstance(editor);
    props.onMount?.(editor, monaco);

    if (props.handleSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        props.handleSave?.(editor.getValue());
      });
    }
  };

  return (
    <DragProvider editor={editorInstance}>
      <MonacoEditor
        height="100%"
        defaultLanguage={props.language || 'json'}
        theme={((options as unknown as Record<string, unknown>)?.theme as string) || 'vs-dark'}
        {...props}
        value={value}
        options={options}
        onChange={handleChange}
        onMount={editorDidMount}
      />
    </DragProvider>
  );
};
