import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';

import { useOptions } from './hooks/useOptions';
import { useLanguageProvider } from './hooks/useLanguageProvider';
import { useMonacoEditorThemes } from './hooks/useMonacoEditorThemes';
import { useDiagnosticsOptions } from './hooks/useDiagnosticsOptions';

export const DiffEditor = (props) => {
  const options = useOptions(props.options);

  useMonacoEditorThemes();
  useDiagnosticsOptions();
  useLanguageProvider(props.value);

  return (
    <MonacoDiffEditor
      height="100%"
      defaultLanguage="json"
      theme={options?.theme || 'vs-dark'}
      {...props}
      options={options}
    />
  );
};
