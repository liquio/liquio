import React from 'react';
import propTypes from 'prop-types';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import { GridActionsCellItem } from '@mui/x-data-grid';

import ConfirmDialog from 'components/ConfirmDialog';
import { ReactComponent as DeleteIcon } from 'components/FileDataTable/assets/ic_delete.svg';

const DeleteUserAction = ({ t, user, handleDelete, load, isDataTable }) => {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = React.useCallback(async () => {
    setOpen(false);
    await handleDelete(user);
    load();
  }, [handleDelete, load, user]);

  const handleOpen = React.useCallback(() => setOpen(true), []);

  const handleClose = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <Tooltip title={t('Delete')}>
        {isDataTable ? (
          <IconButton onClick={handleOpen} aria-label={t('Delete')}>
            <DeleteIcon />
          </IconButton>
        ) : (
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label={t('Delete')}
            aria-label={t('Delete')}
            onClick={handleOpen}
          />
        )}
      </Tooltip>

      <ConfirmDialog
        open={open}
        title={t('DeleteUser')}
        description={t('DeleteUserPrompt')}
        handleClose={handleClose}
        handleConfirm={handleConfirm}
      />
    </>
  );
};

DeleteUserAction.propTypes = {
  t: propTypes.func.isRequired,
  user: propTypes.object.isRequired,
  handleDelete: propTypes.func.isRequired,
  load: propTypes.func.isRequired,
  isDataTable: propTypes.bool
};

DeleteUserAction.defaultProps = {
  isDataTable: false
};

export default translate('UserListPage')(DeleteUserAction);
