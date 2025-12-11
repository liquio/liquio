import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';

import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const UserActiveMenuItem = ({
  t,
  actions: { blockUser, unblockUser },
  user: { id, isActive },
  readOnly,
}) => {
  if (readOnly) return null;

  return isActive ? (
    <MenuItem onClick={() => blockUser(id)}>
      <ListItemIcon>
        <BlockIcon />
      </ListItemIcon>
      <ListItemText primary={t('BlockUser')} />
    </MenuItem>
  ) : (
    <MenuItem onClick={() => unblockUser(id)}>
      <ListItemIcon>
        <CheckCircleOutlineIcon />
      </ListItemIcon>
      <ListItemText primary={t('UnblockUser')} />
    </MenuItem>
  );
};

UserActiveMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object,
  user: PropTypes.object,
  onClose: PropTypes.func,
  readOnly: PropTypes.bool,
};

UserActiveMenuItem.defaultProps = {
  actions: {
    blockUser: () => null,
    unblockUser: () => null,
  },
  user: {},
  onClose: () => null,
  readOnly: false,
};

export default translate('UserListPage')(UserActiveMenuItem);
