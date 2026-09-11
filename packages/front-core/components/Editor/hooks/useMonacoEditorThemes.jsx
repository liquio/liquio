import React from 'react';
import { useMonaco } from '@monaco-editor/react';

import nord from '../themes/nord.json';
import dracula from '../themes/dracula.json';

const themes = {
  dracula,
  nord
};

export const useMonacoEditorThemes = () => {
  const monaco = useMonaco();
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (initialized || !monaco) return;

    Object.keys(themes).forEach((theme) => {
      monaco.editor.defineTheme(theme, themes[theme]);
    });
    setInitialized(true);
  }, [monaco, initialized]);
};
