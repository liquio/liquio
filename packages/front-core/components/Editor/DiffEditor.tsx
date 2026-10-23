import React from 'react';
import { DiffEditor as MonacoDiffEditorRaw } from '@monaco-editor/react';

import { useOptions } from './hooks/useOptions';
import { useLanguageProvider } from './hooks/useLanguageProvider';
import { useMonacoEditorThemes } from './hooks/useMonacoEditorThemes';
import { useDiagnosticsOptions } from './hooks/useDiagnosticsOptions';

// The original always passes `defaultLanguage`, which isn't a real prop on
// @monaco-editor/react's DiffEditor (it only accepts `language`) — an
// invalid prop that was already being silently ignored before conversion.
const MonacoDiffEditor = MonacoDiffEditorRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DiffEditorProps {
  value?: string;
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

export const DiffEditor = (props: DiffEditorProps) => {
  const options = useOptions(props.options);

  useMonacoEditorThemes();
  useDiagnosticsOptions();
  useLanguageProvider(props.value);

  return (
    <MonacoDiffEditor
      height="100%"
      defaultLanguage="json"
      theme={((options as unknown as Record<string, unknown>)?.theme as string) || 'vs-dark'}
      {...props}
      options={options}
    />
  );
};
