import React from 'react';
import { IconButton, Menu, Toolbar } from '@mui/material';
import SearchIcon from 'assets/icons/mdi_database-search.svg';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditKeyMenuItemRaw from './EditKeyMenuItem';
import DeleteKeyMenuItemRaw from './DeleteKeyMenuItem';
import AccessKeyMenuItemRaw from './AccessKeyMenuItem';
import ExportRegisterKeysXLSXRaw from './ExportRegisterKeysXLSX';
import ReindexMenuItemRaw from './ReindexMenuItem';

const EditKeyMenuItem = EditKeyMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteKeyMenuItem = DeleteKeyMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const AccessKeyMenuItem = AccessKeyMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportRegisterKeysXLSX = ExportRegisterKeysXLSXRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ReindexMenuItem = ReindexMenuItemRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface KeyActionsProps {
  registerKey?: Record<string, unknown>;
  registerId?: string;
  actions?: { load?: () => void; [key: string]: unknown };
  readOnly?: boolean;
  userUnits?: unknown[];
}

const KeyActions = ({
  registerKey = {},
  registerId = undefined,
  actions = {},
  readOnly = false,
  userUnits,
}: KeyActionsProps) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClose = () => setAnchorEl(null);

  const menuItemProps = {
    actions,
    registerKey,
    registerId,
    onClose: handleClose,
    onChange: actions.load,
    readOnly,
    userUnits,
  };

  return (
    <Toolbar disableGutters={true}>
      <EditKeyMenuItem {...menuItemProps} type={'json'} />

      <EditKeyMenuItem {...menuItemProps} type={'settings'} />

      <AccessKeyMenuItem {...menuItemProps} />

      <IconButton
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
        size="large"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        keepMounted={true}
      >
        {readOnly ? (
          <ExportRegisterKeysXLSX {...menuItemProps} />
        ) : (
          <>
            <ExportRegisterKeysXLSX {...menuItemProps} />
            <EditKeyMenuItem {...menuItemProps} type={'stringify'} />
            <EditKeyMenuItem {...menuItemProps} type={'indexSearch'} />
            <EditKeyMenuItem {...menuItemProps} type={'toExport'} />
            <ReindexMenuItem
              {...menuItemProps}
              label="Reindex"
              action={'reIndex'}
              icon={SearchIcon}
              getUrl={(keyId: string) => `registers/keys/${keyId}/reindex`}
            />

            <DeleteKeyMenuItem {...menuItemProps} />
          </>
        )}
      </Menu>
    </Toolbar>
  );
};

export default KeyActions;
