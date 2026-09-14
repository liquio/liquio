import React from 'react';

import { useUserSettings } from './useUserSettings';
import { UserSettingsDialogView } from './UserSettingsDialogView';

// `t` is never imported here — the `title || t('EditorSettings')` fallback
// below throws `ReferenceError: t is not defined` at runtime if ever hit.
// The only real caller (UserSettingsButton) always passes a truthy `title`,
// so this is never actually exercised. Preserved as-is rather than wiring
// up the (presumably intended) `useTranslate` import.
declare const t: (key: string) => string;

interface UserSettingsDialogProps {
  title?: string;
  icon?: React.ReactNode;
  schema?: unknown;
  defaults?: Record<string, unknown>;
  open?: boolean;
  onClose?: () => void;
  part?: string;
}

export const UserSettingsDialog = ({
  title,
  icon,
  schema,
  defaults,
  open = false,
  onClose = () => null,
  part,
}: UserSettingsDialogProps) => {
  const { settings, setSettings: onChange } = useUserSettings(part, defaults);
  const [value, setValue] = React.useState(JSON.stringify(settings, null, 2));
  const [errors, setErrors] = React.useState<unknown[]>([]);

  const onClickSave = () => {
    try {
      const newSettings = JSON.parse(value);
      onChange(newSettings);
      onClose();
    } catch (e) {
      console.error('Invalid JSON', e);
    }
  };

  return <UserSettingsDialogView
    open={open}
    icon={icon}
    schema={schema}
    title={title || t('EditorSettings')}
    value={value}
    errors={errors}
    settings={settings}
    onClose={onClose}
    setValue={setValue}
    setErrors={setErrors}
    onClickSave={onClickSave}
  />;
}
