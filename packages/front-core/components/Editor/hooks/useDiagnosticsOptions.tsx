import React from 'react';
import { useMonaco } from '@monaco-editor/react';

export const useDiagnosticsOptions = () => {
  const monaco = useMonaco();
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (initialized || !monaco) return;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      trailingCommas: 'warning',
      comments: 'ignore'
    });
    setInitialized(true);
  }, [monaco, initialized]);
};
