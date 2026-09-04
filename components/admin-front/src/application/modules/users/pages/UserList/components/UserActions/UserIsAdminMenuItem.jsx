import React from 'react';
import PropTypes from 'prop-types';
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

const UserIsAdminMenuItem = ({
  t,
  actions: { unsetAdmin, setAdmin },
  user: { id, role },
  onClose,
  readOnly,
}) => {
  const [open, setOpen] = React.useState(false);

  const isAdmin = role.split(';').includes('admin');

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
    handler(id);
    closeDialog();
  };

  if (readOnly) return null;

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

UserIsAdminMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object,
  user: PropTypes.object,
  onClose: PropTypes.func,
};

UserIsAdminMenuItem.defaultProps = {
  actions: {
    blockUser: () => null,
    unblockUser: () => null,
  },
  user: {},
  onClose: () => null,
};

export default translate('UserListPage')(UserIsAdminMenuItem);
