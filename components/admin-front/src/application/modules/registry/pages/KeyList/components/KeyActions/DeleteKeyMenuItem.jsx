import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import ConfirmDialog from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';

const DeleteKeyMenuItem = ({
  t,
  registerId,
  registerKey,
  actions,
  onClose,
}) => {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);

  return (
    <>
      <MenuItem
        onClick={() => {
          setOpen(true);
          onClose();
        }}
      >
        <ListItemIcon>
          <DeleteIcon />
        </ListItemIcon>
        <ListItemText primary={t('DeleteKey')} />
      </MenuItem>
      <ConfirmDialog
        open={open}
        darkTheme={true}
        title={t('DeletePrompt')}
        description={t('DeletePropmtDescription')}
        handleClose={() => setOpen(false)}
        handleConfirm={async () => {
          try {
            await promiseChain(
              [actions.deleteKey, actions.load, () => setOpen(false)],
              { registerId, keyId: registerKey.id },
            );
          } catch (e) {
            setError(e);
          }
        }}
      />
      <ConfirmDialog
        open={!!error}
        darkTheme={true}
        title={t('DeleteError')}
        description={t(error && error.message)}
        handleClose={() => setError(null)}
      />
    </>
  );
};

DeleteKeyMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
};

export default translate('KeyListAdminPage')(DeleteKeyMenuItem);
