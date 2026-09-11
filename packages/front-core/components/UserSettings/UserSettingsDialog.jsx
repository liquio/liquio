import React from 'react';

import { useUserSettings } from './useUserSettings';
import { UserSettingsDialogView } from './UserSettingsDialogView';

export const UserSettingsDialog = ({
  title,
  icon,
  schema,
  defaults,
  open = false,
  onClose = () => null,
  part,
}) => {
  const { settings, setSettings: onChange } = useUserSettings(part, defaults);
  const [value, setValue] = React.useState(JSON.stringify(settings, null, 2));
  const [errors, setErrors] = React.useState([]);

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