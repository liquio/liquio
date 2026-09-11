import { useMemo } from 'react';

import { useUserSettings } from 'components/UserSettings';
import { defaultEditorOptions } from '../variables/defaultEditorOptions';

export const useOptions = (options = {}) => {
  const { settings } = useUserSettings('editor');

  return useMemo(
    () => ({
      ...defaultEditorOptions,
      ...(settings?.options || {}),
      ...options
    }),
    [settings, options]
  );
};
