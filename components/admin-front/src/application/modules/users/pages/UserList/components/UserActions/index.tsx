import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import { history } from 'store';

import ManageHistoryIcon from 'assets/img/ic_sharp-manage-history.svg';

import UserActiveMenuItemRaw from './UserActiveMenuItem';
import UserUnitsMenuItemRaw from './UserUnitsMenuItem';
import UserIsAdminMenuItemRaw from './UserIsAdminMenuItem';
import UserCertMenuItemRaw from './UserCertMenuItem';
import UserDocumentsRaw from './UserDocuments';
import DeleteUserRaw from './deleteUser';
import SetPasswordMenuItem from './SetPasswordMenuItem';
import Toggle2FA from './Toggle2FA';
import { getConfig } from 'core/helpers/configLoader';

const UserActiveMenuItem = UserActiveMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const UserUnitsMenuItem = UserUnitsMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const UserIsAdminMenuItem = UserIsAdminMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const UserCertMenuItem = UserCertMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const UserDocuments = UserDocumentsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteUser = DeleteUserRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserItem {
  id: string;
  [key: string]: unknown;
}

interface UserActionsProps {
  t: (key: string) => string;
  user?: UserItem;
  actions?: { load?: () => void; [key: string]: unknown };
  readOnly?: boolean;
}

const UserActions = ({ t, user = {} as UserItem, actions = {}, readOnly = false }: UserActionsProps) => {
  const config = getConfig() as unknown as { enabledDeleteUser?: boolean };

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleClick = ({ currentTarget }: React.MouseEvent<HTMLElement>) => setAnchorEl(currentTarget);
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

        <UserCertMenuItem user={user} onClose={handleClose} t={t} />

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

        <Toggle2FA user={user} load={actions.load as () => void} />

        {config?.enabledDeleteUser ? (
          <DeleteUser actions={actions} user={user} onClose={handleClose} onChange={actions.load} />
        ) : null}
      </Menu>
    </>
  );
};

export default translate('UserListPage')(UserActions as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
