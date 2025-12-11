import { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

import { useOptions } from './hooks/useOptions';
import { useLanguageProvider } from './hooks/useLanguageProvider';
import { useMonacoEditorThemes } from './hooks/useMonacoEditorThemes';
import { useDiagnosticsOptions } from './hooks/useDiagnosticsOptions';
import { useInlineCompletionProvider } from './hooks/useInlineCompletionProvider';
import { DragProvider } from './DragProvider';

export const Editor = (props) => {
  const [value, setValue] = useState(props.value || '');

  useEffect(() => {
    if (props.value !== undefined && props.value !== value) {
      setValue(props.value);
    }
  }, [props.value]);

  const handleChange = (newValue) => {
    setValue(newValue);
    props.onChange && props.onChange(newValue);
  };
  const [editorInstance, setEditorInstance] = useState(null);

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
  useInlineCompletionProvider(props.language);

  const editorDidMount = (editor, monaco) => {
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
        theme={options?.theme || 'vs-dark'}
        {...props}
        value={value}
        options={options}
        onChange={handleChange}
        onMount={editorDidMount}
      />
    </DragProvider>
  );
};
