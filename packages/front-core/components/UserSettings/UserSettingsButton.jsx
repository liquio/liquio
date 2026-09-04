import React from 'react';

import { useTranslate } from 'react-translate';
import { IconButton, Tooltip } from '@mui/material';

import SettingsIcon from '@mui/icons-material/Settings';
import { UserSettingsDialog } from './UserSettingsDialog';

export const UserSettingsButton = ({ part, title, icon, schema, defaults, ...props }) => {
  const t = useTranslate('WorkflowAdminPage');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={title || t('EditorSettings')}>
        <IconButton onClick={() => setOpen(true)} {...props}>
          {icon || <SettingsIcon />}
        </IconButton>
      </Tooltip>
      <UserSettingsDialog
        open={open}
        icon={icon}
        schema={schema}
        defaults={defaults}
        title={title || t('EditorSettings')}
        onClose={() => setOpen(false)} part={part}
      />
    </>
  );
}