import React from 'react';
import { translate } from 'react-translate';

import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';

import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface UserActiveMenuItemProps {
  t: (key: string) => string;
  actions?: { blockUser: (id: string) => void; unblockUser: (id: string) => void };
  user?: { id?: string; isActive?: boolean };
  onClose?: () => void;
  readOnly?: boolean;
}

const UserActiveMenuItem = ({
  t,
  actions: { blockUser, unblockUser } = { blockUser: () => null, unblockUser: () => null },
  user: { id, isActive } = {},
  readOnly = false,
}: UserActiveMenuItemProps) => {
  if (readOnly) return null;

  return isActive ? (
    <MenuItem onClick={() => blockUser(id as string)}>
      <ListItemIcon>
        <BlockIcon />
      </ListItemIcon>
      <ListItemText primary={t('BlockUser')} />
    </MenuItem>
  ) : (
    <MenuItem onClick={() => unblockUser(id as string)}>
      <ListItemIcon>
        <CheckCircleOutlineIcon />
      </ListItemIcon>
      <ListItemText primary={t('UnblockUser')} />
    </MenuItem>
  );
};

export default translate('UserListPage')(UserActiveMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
