import { useMemo } from 'react';

// Imported from the concrete file rather than the `components/UserSettings`
// barrel: the barrel also re-exports UserSettingsButton -> UserSettingsDialog
// -> UserSettingsDialogView, which itself imports `components/Editor` —
// a circular import that surfaced as a real "Cannot access before
// initialization" crash once this directory became TypeScript (the module
// evaluation order changed enough to expose it). Importing the hook
// directly breaks the cycle without changing what it exports.
import { useUserSettings } from 'components/UserSettings/useUserSettings';
import { defaultEditorOptions } from '../variables/defaultEditorOptions';

export const useOptions = (options: Record<string, unknown> = {}) => {
  const { settings } = useUserSettings('editor') as unknown as { settings: Record<string, unknown> };

  return useMemo(
    () => ({
      ...defaultEditorOptions,
      ...((settings?.options as Record<string, unknown>) || {}),
      ...options
    }),
    [settings, options]
  );
};
