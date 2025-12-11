import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Menu, Toolbar } from '@mui/material';
import SearchIcon from 'assets/icons/mdi_database-search.svg';
import SearchIconSync from 'assets/icons/mdi_database-sync.svg';
import DeleteIconSync from 'assets/icons/mdi_database-remove.svg';
import AddIconSync from 'assets/icons/mdi_database-add.svg';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditKeyMenuItem from './EditKeyMenuItem';
import DeleteKeyMenuItem from './DeleteKeyMenuItem';
import AccessKeyMenuItem from './AccessKeyMenuItem';
import ExportRegisterKeysXLSX from './ExportRegisterKeysXLSX';
import ReindexMenuItem from './ReindexMenuItem';

const KeyActions = ({
  registerKey,
  registerId,
  actions,
  readOnly,
  userUnits,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const elasticAdmin = userUnits.find(({ id }) => id === 1000012);

  const handleClose = () => setAnchorEl(null);

  const menuItemProps = {
    actions,
    registerKey,
    registerId,
    onClose: handleClose,
    onChange: actions.load,
    readOnly,
  };

  const elasticAdded = (registerKey?.meta?.afterhandlers || []).includes(
    'elastic',
  );

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
              getUrl={(keyId) => `registers/keys/${keyId}/reindex`}
            />

            {elasticAdmin && (
              <>
                {elasticAdded ? (
                  <>
                    <ReindexMenuItem
                      {...menuItemProps}
                      icon={SearchIconSync}
                      listenStatus={actions?.handleUpdateStatus}
                      label="AfterhandlersReindex"
                      action={'reIndex'}
                      getUrl={(keyId) =>
                        `registers/keys/${keyId}/afterhandlers-reindex`
                      }
                    />
                    <ReindexMenuItem
                      {...menuItemProps}
                      icon={DeleteIconSync}
                      listenStatus={actions?.handleUpdateStatus}
                      label="RemoveFromElastic"
                      action={'deleteFromElastic'}
                      getUrl={(keyId) => `registers/keys/${keyId}`}
                    />
                  </>
                ) : (
                  <ReindexMenuItem
                    {...menuItemProps}
                    icon={AddIconSync}
                    listenStatus={actions?.handleUpdateStatus}
                    action={'addToElastic'}
                    label="AddToElastic"
                    getUrl={(keyId) => `registers/keys/${keyId}`}
                  />
                )}
              </>
            )}
            <DeleteKeyMenuItem {...menuItemProps} />
          </>
        )}
      </Menu>
    </Toolbar>
  );
};

KeyActions.propTypes = {
  key: PropTypes.object,
  actions: PropTypes.object,
  registryId: PropTypes.string,
  readOnly: PropTypes.bool,
};

KeyActions.defaultProps = {
  key: {},
  actions: {},
  registryId: null,
  readOnly: false,
};

export default KeyActions;
