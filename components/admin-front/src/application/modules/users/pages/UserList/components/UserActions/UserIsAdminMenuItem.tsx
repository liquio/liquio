import React from 'react';
import { translate } from 'react-translate';

import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

import BlockIcon from '@mui/icons-material/Block';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface UserIsAdminMenuItemProps {
  t: (key: string) => string;
  actions?: { unsetAdmin: (id: string) => void; setAdmin: (id: string) => void };
  user?: { id?: string; role?: string };
  onClose?: () => void;
}

const UserIsAdminMenuItem = ({
  t,
  actions: { unsetAdmin, setAdmin } = { blockUser: () => null, unblockUser: () => null } as unknown as {
    unsetAdmin: (id: string) => void;
    setAdmin: (id: string) => void;
  },
  user: { id, role } = {},
  onClose = () => null,
}: UserIsAdminMenuItemProps) => {
  const [open, setOpen] = React.useState(false);

  const isAdmin = (role as string).split(';').includes('admin');

  const handler = isAdmin ? unsetAdmin : setAdmin;
  const icon = isAdmin ? <BlockIcon /> : <AccountCircleIcon />;
  const actionText = isAdmin ? 'UnsetAdmin' : 'SetAdmin';

  const openDialog = () => {
    setOpen(true);
    onClose();
  };

  const closeDialog = () => {
    setOpen(false);
    onClose();
  };

  const saveChanges = () => {
    handler(id as string);
    closeDialog();
  };

  return (
    <>
      <MenuItem onClick={openDialog}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={t(actionText)} />
      </MenuItem>
      <Dialog open={open}>
        <DialogTitle>{t('DialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: 'white' }}>
            {t(isAdmin ? 'UnsetSetAdminTitle' : 'SetAdminTitle')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('Cancel')}</Button>
          <Button variant="contained" color="primary" onClick={saveChanges}>
            {t('OK')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default translate('UserListPage')(UserIsAdminMenuItem as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
