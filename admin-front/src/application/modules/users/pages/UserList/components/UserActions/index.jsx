import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import { history } from 'store';

import ManageHistoryIcon from 'assets/img/ic_sharp-manage-history.svg';

import UserActiveMenuItem from './UserActiveMenuItem';
import UserUnitsMenuItem from './UserUnitsMenuItem';
import UserIsAdminMenuItem from './UserIsAdminMenuItem';
import UserCertMenuItem from './UserCertMenuItem';
import UserDocuments from './UserDocuments';
import DeleteUser from './deleteUser.jsx';
import SetPasswordMenuItem from './SetPasswordMenuItem';
import Toggle2FA from './Toggle2FA';
import { getConfig } from '../../../../../../../core/helpers/configLoader.js';

const UserActions = ({ t, user, actions, readOnly }) => {
  const config = getConfig();

  const [anchorEl, setAnchorEl] = React.useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleClick = ({ currentTarget }) => setAnchorEl(currentTarget);
  const handleClose = () => setAnchorEl(null);

  const workflowJournalRedirect = () => {
    localStorage.setItem('UsersFilterHandlerValue', JSON.stringify(user));
    localStorage.setItem(
      'useTableprocessList',
      JSON.stringify({
        count: 100000,
        data: null,
        error: null,
        filters: {
          userData: user.id
        },
        hiddenColumns: [],
        loading: false,
        page: 1,
        presets: [],
        rowsPerPage: 10,
        rowsSelected: [],
        search: '',
        sort: {}
      })
    );

    history.push(`/workflow/journal/?user=${user.id}`);
  };

  return (
    <>
      <div
        style={{
          display: 'flex'
        }}
      >
        <UserUnitsMenuItem
          actions={actions}
          user={user}
          onClose={handleClose}
          onChange={actions.load}
          readOnly={readOnly}
        />

        <Tooltip title={t('UserWorkflowJournal')}>
          <IconButton onClick={workflowJournalRedirect} size="large">
            <AssignmentIcon />
          </IconButton>
        </Tooltip>

        <UserCertMenuItem user={user} onClose={handleClose} />

        <IconButton onClick={handleClick} size="large">
          <MoreVertIcon />
        </IconButton>
      </div>

      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleClose} keepMounted={true}>
        <UserIsAdminMenuItem
          actions={actions}
          user={user}
          onClose={handleClose}
          onChange={actions.load}
          readOnly={readOnly}
        />

        <UserActiveMenuItem
          actions={actions}
          user={user}
          onClose={handleClose}
          onChange={actions.load}
          readOnly={readOnly}
        />

        {readOnly ? null : (
          <MenuItem onClick={() => history.push(`/users/accessJournal#userId=${user.id}`)}>
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary={t('UserAccessHistory')} />
          </MenuItem>
        )}
        {readOnly ? null : (
          <MenuItem onClick={() => history.push(`/users/accessJournal#initUserId=${user.id}`)}>
            <ListItemIcon>
              <img
                style={{
                  position: 'relative',
                  left: 3,
                  width: 23
                }}
                src={ManageHistoryIcon}
                alt={'manage history icon'}
              />
            </ListItemIcon>
            <ListItemText primary={t('UserAccessJournal')} />
          </MenuItem>
        )}
        <UserDocuments user={user} onClose={handleClose} />

        <SetPasswordMenuItem user={user} onClose={handleClose} />

        <Toggle2FA user={user} onClose={handleClose} load={actions.load} />

        {config?.enabledDeleteUser ? (
          <DeleteUser actions={actions} user={user} onClose={handleClose} onChange={actions.load} />
        ) : null}
      </Menu>
    </>
  );
};

UserActions.propTypes = {
  user: PropTypes.object,
  actions: PropTypes.object,
  t: PropTypes.func.isRequired,
  readOnly: PropTypes.bool
};
UserActions.defaultProps = {
  user: {},
  actions: {},
  readOnly: false
};

export default translate('UserListPage')(UserActions);
